import type { Guide } from "./types";

// Unpublished editorial batch. The parent release owns registration and topic membership.
const valveMaps = {
  label: "Valve: CS2 maps and Source 2 overview",
  url: "https://www.counter-strike.net/cs2?l=english",
};
const valveNews = {
  label: "Valve: Counter-Strike 2 update history",
  url: "https://www.counter-strike.net/news/CS2?l=english",
};
const mapFixes = {
  label: "Valve: map geometry and clipping updates, October–November 2023",
  url: "https://store.steampowered.com/news/posts/?appids=730&enddate=1700265006&feed=steam_community_announcements",
};
const workshopSource = {
  label: "Valve: the Maps Workshop announcement, November 2023",
  url: "https://store.steampowered.com/news/posts/?appids=730&enddate=1699497142&feed=steam_community_announcements",
};
const inputSource = {
  label: "Valve: Side-stepping Skill and input rules, August 19, 2024",
  url: "https://store.steampowered.com/news/posts/?appids=730&enddate=1724194853&feed=steam_community_announcements",
};
const storeSource = {
  label: "Valve: CS2 store listing and system requirements",
  url: "https://store.steampowered.com/app/730/CounterStrike_2/",
};
const telemetrySource = {
  label: "Steam Support: Source 2 telemetry HUD",
  url: "https://help.steampowered.com/en/faqs/view/5E6F-5B36-5485-F6B9",
};
type Draft = Omit<Guide, "cluster" | "updated" | "sections"> & { sections: [string, string][] };
function article(draft: Draft): Guide {
  return {
    ...draft,
    cluster: "FPS & aim",
    updated: "2026-10-31",
    sections: draft.sections.map(([title, body], i) => ({ id: `section-${i + 1}`, title, body })),
  };
}

export const WAVE2_MAPS_TECH_GUIDES: Guide[] = [
  article({
    slug: "nuke-callouts",
    keyword: "nuke callouts",
    secondary: ["nuke cs2 map", "nuke ramp", "nuke duel angles"],
    title: "Nuke Callouts: Ramp, Sites and Vertical Duels",
    description:
      "Learn Nuke callouts by route and floor. Understand ramp, outside, heaven and lower-site angles, then practise short calls and controlled duels.",
    h1: "Nuke callouts: learn the floor before the angle",
    answer:
      "Learn Nuke callouts as a connected route: lobby to hut or squeaky for upper A, lobby to ramp for lower B, and outside toward secret for another lower approach. Add the floor, direction and last confirmed position to each call. These are practical community labels; agree on ambiguous names with your team before playing.",
    facts: [
      "Nuke's stacked sites make a location without a floor unusually easy to misread.",
      "A sound or smoke establishes less than a direct sighting; tell teammates which kind of information you have.",
      "Ramp control opens decisions about the lower site; it does not confirm that every opponent went B.",
      "A practice duel should define its permitted lane and spawns before either player moves.",
    ],
    sections: [
      [
        "Build a route map rather than a word list",
        `Start in a local practice session and walk from the attacking spawn toward lobby. Stop at each branching choice and describe what it connects. Lobby is useful because it organizes several threats: movement through hut toward A, pressure through the door often called squeaky, and the route toward ramp. A teammate hearing “lobby” needs that branch as soon as it becomes known. “Two lobby, one moving ramp” supports a decision; “they are inside” mostly creates more questions.

Walk outside separately. Identify the large exterior landmarks, garage, the route toward secret and the defender-side return paths. Treat red and blue container names as local vocabulary that must match your team's convention. Do not learn a color label from an old overhead and assume every player uses it in exactly the same way. Point at the object during practice, say the label, then ask another player to describe the route away from it.

Finally connect those routes to the two sites. Knowing that A sits above B helps, but a useful mental map includes the actual transitions between floors. A player at a vent entrance and a player already below it have different options. Valve's CS2 overview describes map rebuilds and upgrades; its patch history also records geometry fixes. Neither is a complete official dictionary of player slang. Use the current installed geometry as your final reference when an old diagram and an accessible route disagree.`,
      ],
      [
        "Upper A: hut, squeaky, rafters, heaven and hell",
        `On upper A, learn entrance names first and holding positions second. Hut is an entry structure; squeaky describes the nearby door route. A defender can watch either entrance from several elevations and offsets. A call of “hut” may mean inside the hut, at its exit, or an opponent who just crossed from it. Add the action: “exiting hut” is much more useful than repeating the place name loudly after the opponent has already moved.

Heaven generally identifies the elevated defender-side position overlooking upper A, while hell refers to the lower space underneath that elevated area. Rafters describes high interior walkways or beams around the upper site. These labels are relational, so practise looking back from the site as well as entering it. A position that seems obvious from the doorway can disappear behind cover when you stand near the plant area.

| Upper-site call | What to clarify | Helpful follow-up |
| --- | --- | --- |
| Hut | Inside or already exiting | Number seen and direction |
| Squeaky | Door pressure or actual entry | Whether the door is open |
| Heaven | Elevated position or approaching route | Holding or dropping |
| Hell | Below heaven rather than upstairs | Which side of the cover |

Clear one visual slice at a time. Do not turn every entry into a panoramic flick between all elevated positions. Choose a starting angle based on information, let a partner cover a different threat, and update the plan when a new opponent appears. The table is a communication aid, not a promise that these four names cover every safe hiding place.`,
      ],
      [
        "Ramp: distinguish the room, descent and lower exits",
        `Ramp is both a contested area and a route toward B. That double meaning causes avoidable rotations. “One ramp entrance” tells a teammate where contact began. “One descending ramp” tells them the route has progressed. “Lost ramp, no lower sighting” preserves uncertainty and lets the lower defenders choose positions without treating a guess as confirmed information. The person falling back should give the update while they still understand which angles they have abandoned.

For practice, divide the route into three phases. First, check the approach and close cover at the room. Second, establish whether you can see the descent without exposing yourself to another line. Third, enter lower only after deciding which lower doorway or lane a partner will watch. Your crosshair height changes with the slope and relative elevation. A fixed screen-height habit is less useful than aiming where a head can actually emerge from the next piece of cover.

A defender need not contest until death to retain value. Falling back can preserve a crossfire or leave the attacker uncertain about how far the retreat went. The tradeoff is that retreat hands over space. Describe the space you surrendered rather than claiming you still control it because you can hear footsteps there. On offense, avoid stacking several players behind the first model in a narrow lane: one obstacle can stop the whole group from trading.

Use a simple failure note after each exercise: wrong floor, missed close corner, exposed to two lanes, or late call. Those categories lead to distinct corrections. A faster flick does little for a death caused by a teammate believing you were watching a doorway you had already left.`,
      ],
      [
        "Outside and secret: separate a crossing from a commitment",
        `Outside offers long sightlines and several opportunities to lose visual contact. A player crossing toward secret may be seeking lower access, gathering information, or stopping behind exterior cover. A smoke wall can hide the crossing without proving how many players used it. Call what you observed and then name the unobserved route: “one crossed toward secret; lower not checked.” That phrasing helps an anchor prepare without forcing the whole team to rotate on a single incomplete clue.

Practise the outside route from both ends. Stand near the attacking approach and list the lanes that can see the crossing. Then move to the defender positions and look at the same route in reverse. The goal is to understand what remains exposed if one lane is blocked. A smoke that interrupts a long view does not clear a close player next to the route. A crossing can also become unsafe as cover fades or a defender changes elevation.

Do not combine every exterior landmark into one “outside” call once contact becomes specific. Garage, secret approach and the area near the large silo describe different problems. Begin with the broad label if necessary, then narrow it when you can do so accurately. If a team uses mini for the lower entrance onto A from outside, point out that doorway during the walk so nobody interprets it as secret.

The decision question is whether you have enough information to keep moving. If a partner cannot watch your retreat and you have no confirmed lower position, chasing an exterior opponent may trade a known safe route for two unknown ones. Practise stopping behind cover and making that decision, not only sprinting the full route on every repetition.`,
      ],
      [
        "Lower B: use doors and the site to describe a retake",
        `At B, orient yourself by the site's cover and the routes you can actually reach. Teams commonly use decon, control, double doors and single door to break lower into manageable areas. Door naming can vary, especially when two players describe the same entrance from opposite sides. Before a match, agree which physical door each short label means. During a live round, a plain description such as “lower, door by ramp” is better than an unfamiliar nickname delivered with confidence.

Retake calls should separate access from clearance. Reaching the room outside a doorway does not mean the space beyond it is safe. Tell a partner when you are ready to expose the shared angle, then move in a way that allows a trade. If one player goes through a door while the other is still looking at the radar, the nominal two-player retake has become two isolated fights.

| Lower information | Reasonable interpretation | Unsafe assumption |
| --- | --- | --- |
| Footsteps near a doorway | Someone may be close | Exact side of the door |
| Ramp player disappeared | Ramp view was lost | All attackers entered B |
| Bomb seen on lower site | Objective location confirmed then | Every opponent is nearby |
| One lower angle cleared | That slice was checked | Entire lower site is empty |

For post-plant practice, identify which route can see the planted objective and which routes expose the defender first. Use that geometry to choose a position. Do not treat a spot name as a universal best position: teammates, remaining time, utility and the actual plant change the task. This is a map communication guide, while [CS2 economy](/guides/cs2-economy) handles the equipment decisions behind a retake.`,
      ],
      [
        "Run a constrained Nuke duel and a communication drill",
        `A useful 1v1 has a narrow question. Choose ramp entrance versus a defined defender position to practise stopping and clearing. Choose one upper doorway versus one permitted holding area to practise first-contact placement. Allowing every vent, exterior flank and floor transition immediately turns a focused drill into hide-and-seek. Wider play has value later, once both players can explain why the first duel was won or lost.

Use mirrored repetitions: swap roles after a small equal block, keep the weapon and armor conditions identical, and state whether utility is allowed. Do not compare an attacker facing three possible positions with a defender who knows the attacker's exact spawn and call the resulting score a clean aim measurement. That exercise measures prediction under unequal information as well as mechanical control.

- Walk lobby, upper, ramp, outside and lower once without shooting.
- Agree what heaven, hell, mini and each lower door mean.
- Choose one duel lane, two legal spawns and a reset point.
- Call location, floor, count and movement after each sighting.
- Repeat the same angle from the reverse role before changing it.
- Record one specific communication error and one clearing error.

For a second drill, have a partner move through a short route while you watch only part of it. Call sightings and mark the moment your certainty ends. Compare the call with the partner's actual route afterward. The objective is honest information, not guessing correctly by chance. Use [counter-strafing practice](/guides/counter-strafing) for stopping mechanics and [Mirage callouts](/guides/mirage-callouts) to see how a less vertical map changes the vocabulary.`,
      ],
      [
        "Review calls without burying the next fight",
        `After a death, provide the last position and relevant movement, then leave room for living players to hear the game. A long explanation of how an opponent surprised you can cover the very footsteps your teammate needs. Separate immediate information from the later review. During the round, “upper, behind hut, one seen” is actionable. Between rounds, discuss whether you exposed too many angles or whether the teammate covering heaven had moved.

Review the age of information as well as its wording. If an opponent was seen at ramp several seconds ago, say “last seen ramp” rather than presenting it as a live marker. Avoid exact counts inferred from a single loud sequence of footsteps. If two models were visible together, that is stronger evidence than hearing several sounds from the same area. The difference matters most when deciding whether the unobserved site still needs an anchor.

To learn names efficiently, use recall in both directions. Given a place, say its name; given a name, walk there without consulting the radar. Then describe one route out of it and one angle that threatens it. This produces a usable map model rather than a collection of labels you recognize only on a flat image. Add regional slang only after the basic route language is reliable.

This guide does not claim a current Premier selection or event veto list. A map can remain useful for custom practice regardless of queue changes. The [FPS & aim hub](/guides/topics/fps-and-aim) organizes the wider practice library. Check the live client or the relevant competition rules when the question is availability rather than navigation.`,
      ],
      [
        "If you switch from map practice to a browser duel",
        `[PvPStrike](/fps-1v1) is a separate CS-style browser game, not Valve CS2 and not a Nuke server. A short cover-and-aim drill can transfer attention habits, but Nuke routes, binds and grenade plans do not transfer as game content. Compare access in [browser FPS games](/guides/browser-fps-games), native hosting in [CS2 1v1 for money](/guides/cs2-1v1-for-money), and payment terminology in [crypto FPS games](/guides/crypto-fps-game).

Hypothetical USD example A: $1 from each player makes a $2 combined pot. PvPStrike's 5% fee is $0.10; winner credit is $1.90, including the winner's entry, for a +$0.90 net change. Hypothetical USD example B: $5 each makes $10; the fee is $0.50, credit $9.50 and net change +$4.50. The loser loses their entry in either example. These are arithmetic examples, not earnings claims.

Practice is first to seven against a local bot; cash series are best of thirteen. The published minimum entry is $1, with actual available entries shown in the lobby. Cash requires age 18+ and permitted access; no blanket US state legality is claimed. Read the [FPS money guide](/guides/fps-for-money-hub) and [fairness explanation](/fairness). Server validation of inputs, hits and results does not make cheating impossible.`,
      ],
    ],
    faqs: [
      {
        q: "Which Nuke callouts should a new player learn first?",
        a: "Start with lobby, hut, squeaky, ramp, outside, secret, heaven, hell and the two sites. Learn them while walking the connected routes. Add the lower doors only after you can tell a teammate which floor you mean. A small shared vocabulary beats a larger list whose labels mean different things to each player.",
      },
      {
        q: "Does a ramp call mean the attackers are already on B?",
        a: "No. Ramp can refer to the approach, room or descent. Say how far the opponent progressed and which view you lost. An attacker may stop, retreat or hold for a defender. A lower player should prepare for pressure without treating one ramp sighting as proof of a completed site entry.",
      },
      {
        q: "What is the difference between heaven and hell?",
        a: "On Nuke, heaven usually means the elevated defender-side position overlooking upper A; hell means the space below it. They are not alternate names for A and B. Point them out in practice, because a rushed call of 'below' can otherwise be mistaken for the entire lower floor.",
      },
      {
        q: "Where should we practise a simple Nuke 1v1?",
        a: "Use a constrained ramp fight or one upper-site doorway with fixed legal positions. Swap sides and keep weapons, armor and utility rules equal. Avoid allowing every floor transition at first: a player searching several routes is solving a different task from someone holding one known spawn.",
      },
      {
        q: "Are these names an official Valve callout list?",
        a: "No. They are common practical labels and descriptions. Valve's overview and patch notes establish the map context and changes, but do not prescribe every team's vocabulary. Confirm ambiguous door and landmark names with your group, and prefer a clear description when someone does not recognize a nickname.",
      },
      {
        q: "Can a browser arena load the Nuke map?",
        a: "Do not assume that it can. PvPStrike has its own arena, movement and damage rules; it is not a CS2 hosting service. Native Nuke practice belongs in CS2 through the appropriate local or server workflow. General habits such as checking one angle at a time can transfer without the map itself transferring.",
      },
    ],
    sources: [valveMaps, mapFixes, valveNews],
    related: ["mirage-callouts", "counter-strafing", "cs2-economy", "cs2-map-pool"],
  }),
  article({
    slug: "overpass-callouts",
    keyword: "overpass callouts",
    secondary: ["overpass cs2", "overpass monster", "overpass 1v1 spots"],
    title: "Overpass Callouts: Monster, Connector and Sites",
    description:
      "Learn Overpass callouts through connected routes, Monster pressure and connector rotations. Build clear site calls and fair conditions for practice duels.",
    h1: "Overpass callouts: connect the park, connector and B",
    answer:
      "Organize Overpass callouts into the upper park and A approaches, the connector between levels, and the lower B approaches through Monster and short. Add the direction of travel to a place name. A Monster sighting, connector sound and confirmed B entry are different information and should produce different calls.",
    facts: [
      "Monster is a B approach, not a name for every tunnel or lower route.",
      "Connector makes information about rotation direction especially valuable.",
      "A practice 1v1 needs an agreed boundary; an entire-map duel mostly tests searching.",
      "These route descriptions do not assert a current Premier or tournament map pool.",
    ],
    sections: [
      [
        "Learn Overpass as three connected areas",
        `Begin with a walk from attacking spawn into the park side of the map. Find the fountain area, playground, toilets or bathrooms, and the approaches that lead toward A. Use the walk to identify where a teammate can lose sight of a player. A call that remains broad while the opponent crosses several branching routes stops being useful. “One bathrooms, moving toward A” gives more information than “one park” after the player has left the park.

Next walk the lower B approach. Identify Monster, the short approach, the water area, the pillar and the elevated defender position commonly called heaven. Stand on the site and look back toward both entries. An attacker entering Monster and an attacker coming from short can expose a defender to different angles at the same moment. Learning only the attacking view hides this relationship and encourages a site defender to swing into both threats together.

Then connect the two tours through connector. The important feature is not simply that stairs exist. It is that a player who disappears on one level can threaten another route without travelling through the site you are watching. Identify the entrances, turns and exit views rather than memorizing one arrow on a diagram.

Valve's overview establishes Overpass as a rebuilt CS2 map, and Valve's patch notes document collision and visibility changes. The vocabulary in this guide is common team shorthand, not a claim that Valve has standardized every nickname. Start with plain descriptions, agree on local alternatives, and verify physical cover in your installed version before using an old lineup or clearing sequence.`,
      ],
      [
        "A approaches: fountain, bathrooms, long and site",
        `The upper portion of Overpass rewards calls that say which approach is being contested. Fountain is an early landmark; bathrooms describes a separate interior area; long is the wider outside approach toward A. These names should help a teammate choose a lane, not merely establish that something happened somewhere away from B. If you cannot identify the precise room, use a direction from a known landmark and update once you see more.

For entry practice, compare approaching A through bathrooms with taking long. The former asks you to manage doorways and close corners; the latter can expose longer sightlines and a different sequence of cover. Neither route is inherently a guaranteed safe option. Their value depends on what your teammates hold, what defenders have shown and whether you can disengage without losing the objective.

| A-side location | Useful information to add | Decision it helps |
| --- | --- | --- |
| Fountain | Advancing or falling back | Whether park space is contested |
| Bathrooms | Entry side or exit toward A | Which close lane needs help |
| Long | Holding distant line or pushing | Whether another route can progress |
| Truck or site cover | Exact side of the object | Where a trade can be attempted |

Avoid using the site label as a substitute for cover information once you are close enough to see it. “A, behind truck” is useful because it lets a partner avoid clearing the same empty side again. Say “last seen” when the opponent has time to move. A location call is a timestamped observation, not a permanent marker that follows the player invisibly.`,
      ],
      [
        "Monster: call the exit, not just the tunnel",
        `Monster is the large tunnel approach into B. Distinguish an opponent deep in the tunnel from one reaching the mouth and one who has already exited onto the site. The defender's response changes with that progression. A deep opponent may be held at the choke; a player already wide can create a crossfire on someone concentrating only on the tunnel opening. Repeating “Monster” after the player has left it can pull a teammate's crosshair backward.

Walk the entry with no opponent first. List the close corners, the positions farther into site, and the lines from elevated cover. Then add a partner who uses only one permitted position at a time. Build a clearing route that exposes you to one major threat before the next. Do not attempt to inspect the whole site in one fast mouse sweep and call that checking angles. A location was cleared only if your view would actually reveal an opponent there.

On defense, agree who has the tunnel and who has short. A defender peeking Monster while assuming a partner still watches short can be caught as soon as that partner rotates. The handoff should include acknowledgement: “leaving short” followed by someone taking responsibility or a deliberate decision to concede it. Silence is not confirmation that coverage still exists.

Utility can change the entry without proving it is empty. A flash gives a timing opportunity; it does not reveal every hidden model. A smoke blocks selected views while leaving close positions possible. Use current local practice to inspect the result rather than promising that an old clip's throw is exact in today's geometry. This page explains the entry's language and decisions, not a verified pixel lineup.`,
      ],
      [
        "Short, water and the lower site's separate threats",
        `Short and Monster are different B approaches. Calling both “tunnel” hides the distinction that allows defenders to divide responsibility. Walk from the lower route toward short and look at where the site first becomes visible. Then walk Monster and compare the first angles. The order in which pillar, site cover and heaven matter is shaped by your approach. Copying a clearing pattern from the opposite entry can leave the nearest danger unchecked.

Water is a useful landmark, but it is a broad region. Add whether the player is moving toward short, near connector, or holding a particular edge. Sound can suggest activity in the area without confirming the exact position. When you have only audio, say so. A teammate preparing a retake should know whether the marker comes from a model you saw or a noise that could have several explanations.

For lower-site communication, make one player responsible for the closest threat while the second watches the crossing angle. Swap those roles during practice. The goal is to learn what the partner needs to do, not to find a single position that wins against an unsuspecting friend. An elevated defender may see a route that the site player cannot; the site player may cover a close pocket hidden from the elevated view.

When entering after a plant, describe the objective position separately from opponent positions. A call that the bomb is on B does not tell a teammate which cover can see it or whether a surviving attacker has left the site. Practise identifying a position that protects the plant from one route, then ask a partner to approach from the other. The mismatch teaches why location and viewing angle both belong in a useful call.`,
      ],
      [
        "Connector is a route with two ends",
        `Connector can carry pressure between the upper and lower portions of the map. Its tactical value comes from that connection, so “one connector” is incomplete if you can identify the direction. “Connector coming up” and “connector going down” can prompt opposite reactions. Do not add a direction unless you actually observed it. If you heard steps but did not see the player, report the sound and let teammates maintain coverage of both plausible exits.

Set up a practice walk in which one player follows a route through connector while another can see only an entrance. The observer calls the initial sighting and then stops claiming certainty after contact breaks. The moving player chooses to continue, pause or reverse. Compare the call with what happened. This drill reveals how often a confident rotation call is really an assumption about someone continuing at full speed.

| Connector evidence | What you can report | What remains unknown |
| --- | --- | --- |
| Model enters lower end | Confirmed entry and count seen | Whether it will continue upward |
| Steps behind a wall | Audio near connector | Exact floor and direction |
| Model exits upper end | Upper exit at that moment | Whether another player remains below |
| No recent contact | Your view is currently quiet | Whether the route is empty |

Use connector knowledge to choose safer rotations. Running through a contested route can shorten travel while increasing the chance of arriving alone or not arriving at all. Explain that tradeoff in review. The fastest path drawn on a flat image is not automatically the best path when an opponent can occupy a hidden step along it.`,
      ],
      [
        "Build fair Monster and long 1v1 exercises",
        `Monster works for a limited clearing drill if both players agree on a small legal holding area. It works poorly as an aim comparison if the defender can choose anywhere on B while the attacker is forced through one known doorway. That asymmetry is realistic in some rounds, but the resulting score includes an information advantage. Describe the exercise honestly: it is entry practice against hidden cover, not a measurement of who has better raw aim.

For a longer-range exercise, choose a defined segment of the A long approach. Set the spawns, allow time to settle, and forbid flanks outside the exercise boundary. Swap sides after equal blocks. Keep the equipment consistent and decide whether repeated peeking is allowed. A player holding a fixed line and a player making a wide swing solve different tasks; both roles deserve practice before comparing outcomes.

- Identify the physical boundary and both reset positions.
- Agree on weapons, armor and whether utility is permitted.
- Name the closest cover, the main holding line and the fallback.
- Run the first block with a single known defender position.
- Add a second possible position only when clearing is deliberate.
- Swap sides, record the failure type and change one rule at a time.

Review first contact rather than only the kill. Was the crosshair near the likely head position? Did movement stop before the intended accurate shot? Could either player retreat behind cover? Did a call arrive while the partner still had time to act? [Counter-strafing](/guides/counter-strafing) covers stopping mechanics, while [Dust 2 callouts](/guides/dust-2-callouts) offers another example of connecting a name to a route.`,
      ],
      [
        "Manage stale information and quiet rounds",
        `A quiet route is not necessarily an empty route. An opponent may hold still, change pace or wait for a defender to overreact. On Overpass this matters because connector and the separated approaches create several ways for a player to disappear. A useful update describes the limit of your observation: “nothing seen long from this angle” is more honest than “long clear” if you cannot see the far cover or bathrooms exit.

In a slow round, assign the next information task rather than asking every player to push. One teammate can maintain a known line while another checks a limited new slice. Agree on the condition for falling back: lost partner coverage, utility pressure, or contact with more than one opponent. Practise these decisions in a local session by pausing at each branch and explaining what new angle becomes exposed when you move.

After a lost round, reconstruct the route with only confirmed observations. Place each call in order, then mark what the team inferred. Often the useful error is between the two: a Monster smoke caused everyone to assume B, or a connector noise became a claim that an attacker was already near A. Correcting that leap can improve the next round more than memorizing another slang term.

Keep map access separate from map learning. This guide does not promise that Overpass is selectable in any particular live mode or event. Check the current client and organizer rules. The existing [CS2 map-pool guide](/guides/cs2-map-pool) owns that availability question, and the [FPS & aim topic](/guides/topics/fps-and-aim) links the broader mechanics library. A custom practice session can still be valuable when a competitive rotation changes.`,
      ],
      [
        "Keep a separate browser match in context",
        `Overpass practice belongs to native CS2. [PvPStrike](/fps-1v1) is our separate CS-style browser arena; it does not load Overpass or use these site routes. Read [browser FPS access](/guides/browser-fps-games), the [native CS2 duel comparison](/guides/cs2-1v1-for-money), and the [crypto FPS explanation](/guides/crypto-fps-game) before comparing products by appearance alone.

Hypothetical USD example A: two $1 entries create a $2 pot. With PvPStrike's published 5% combined-pot fee, $0.10 is deducted and the winner receives $1.90 credit, a +$0.90 net change. Hypothetical USD example B: two $5 entries create $10; $0.50 fee leaves $9.50 credit and +$4.50 net. The losing entry is lost. These calculations describe no actual result and imply no earnings.

Local bot practice is first to seven; cash matches are best of thirteen. A $1 minimum is published, but consult the lobby for available entries. Cash play is only for adults 18+ where permitted; map skill creates no blanket state legality. The [FPS money hub](/guides/fps-for-money-hub) covers entry decisions. Our [fairness page](/fairness) explains relevant boundaries: validating inputs, hits and match results does not guarantee immunity from cheating.`,
      ],
    ],
    faqs: [
      {
        q: "What are the core Overpass callouts?",
        a: "Learn fountain, playground, bathrooms, long, connector, Monster, short, water, heaven and the two sites first. Walk between them instead of memorizing disconnected labels. Once that route map is clear, add the specific site cover your team uses. Agree on synonyms such as toilets and bathrooms before they create confusion.",
      },
      {
        q: "What does Monster mean on Overpass?",
        a: "Monster is the large tunnel approach into B. Clarify whether the opponent is deep in it, at the opening or already on site. Short is a different approach, so using Monster for every lower threat prevents teammates from dividing their attention and can leave one entry unwatched.",
      },
      {
        q: "Why is connector information so important?",
        a: "Connector links upper and lower routes. The direction of a confirmed movement helps teammates decide which approach may be threatened next. Sound alone may not establish that direction. Report the source and certainty of the information instead of turning a brief noise into a claim that a rotation is complete.",
      },
      {
        q: "Which Overpass spot is useful for a 1v1?",
        a: "A bounded Monster entry or a defined A long segment can isolate a useful skill. Fix spawns, cover, equipment and reset rules, then swap sides. Allowing the defender every site position while forcing one attacker spawn creates entry practice with an information imbalance, rather than a neutral aim test.",
      },
      {
        q: "Do I need exact smoke lineups to learn the callouts?",
        a: "No. Begin with routes, cover and what each lane can see. Utility becomes easier to communicate after those names are shared. If you later add a throw, inspect its landing and coverage in the current map build. This guide does not claim a tested lineup or a universal pixel reference.",
      },
      {
        q: "Is Overpass always available in Premier?",
        a: "Do not infer that from a callout guide. Map selection can differ between Premier, other modes, community servers and events, and it changes over time. Consult the current client or organizer's published rules. The vocabulary remains useful for supported custom practice without establishing any particular queue's present selection.",
      },
    ],
    sources: [valveMaps, mapFixes, valveNews],
    related: ["dust-2-callouts", "counter-strafing", "cs2-map-pool", "mirage-smokes"],
  }),
  article({
    slug: "inferno-callouts",
    keyword: "inferno callouts",
    secondary: ["inferno smokes", "inferno banana", "inferno key smokes"],
    title: "Inferno Callouts: Banana, Sites and Smoke Plans",
    description:
      "Learn Inferno callouts through Banana, apartments and both sites. Understand essential smoke jobs, communication and repeatable utility practice.",
    h1: "Inferno callouts and the smoke jobs they support",
    answer:
      "Learn Inferno by its three main approach problems: Banana toward B, mid toward the A-side lanes, and apartments toward A. Name the route, the nearest cover and the opponent's movement. For smokes, learn the sightline you intend to block before learning a throw; CT and coffins are different B-side jobs, not interchangeable labels.",
    facts: [
      "Controlling part of Banana does not automatically mean B is clear.",
      "Apartments and the A street approaches create different first-contact angles.",
      "A smoke obscures a line of sight; it does not remove opponents behind or beside it.",
      "Lineups must be checked against current geometry and manual input rules.",
    ],
    sections: [
      [
        "A route-first Inferno vocabulary",
        `Walk out from the attacking side and distinguish mid from the second-mid route. Follow the paths toward apartments and toward the street approaches into A. Notice where your view branches: the useful purpose of a callout is to make that branch clear to someone who cannot see your screen. A broad “A side” call is enough for an early warning, but becomes insufficient once a player commits to a lane or exits a doorway.

Next walk Banana from bottom to top. Stop at each major cover position and look back. The same object can protect a player from one direction and expose them from the other. Learning the reverse view explains why an attacker and a defender may describe a seemingly identical duel differently. Do not assume that standing closer to B means you have checked every close pocket behind you.

Finally circle both sites. On A, identify pit, balcony and the major site cover; on B, identify the fountain, coffins, construction-side routes and common plant cover. Teams use variants for some objects, including names inherited from older Counter-Strike versions. Point at the current cover when agreeing on labels. A familiar old name can persist even when the art has changed.

Valve's update history names Inferno locations and records changes to clipping and grenade behavior. That supports checking the current map rather than trusting an old image indefinitely. This guide supplies a practical learning sequence and common shorthand, not an official complete atlas. Keep the vocabulary small enough that all teammates can use it accurately before adding specialist nicknames.`,
      ],
      [
        "Banana: separate possession, pressure and a cleared route",
        `Banana is a route with stages, not one binary control flag. A player can hold the lower approach, contest the upper corner, or reach the B entrance without controlling everything between. Call the stage that matters: “one top Banana behind cover” directs attention much better than “B” when the opponent has not entered the site. If you give up ground, say how far you fell back so teammates know which space is no longer watched.

The main decision is how much exposure each new piece of information costs. Walking forward may reveal one close corner while exposing a farther defender. A flash can create a moment to move, but the move still needs a covered fallback and a teammate ready to trade. Stopping safely after gaining a small amount of space can be better than continuing until a duel is unavoidable.

| Banana information | What it supports | What it does not establish |
| --- | --- | --- |
| One defender seen at top | A known upper threat | Number of defenders on B |
| No contact after a smoke | A quiet interval | An empty route |
| Close corner checked | That pocket was inspected | Every deeper angle is safe |
| Teammate reached entrance | A forward position exists | A complete site clear |

During practice, let a partner use two legal cover choices and vary which one is occupied. Clear the nearest plausible threat without swinging into the second line unnecessarily. Then switch roles and observe what the attacker reveals before seeing the defender. This teaches the geometry behind the call, rather than rewarding whoever memorized the exercise's first spawn.`,
      ],
      [
        "B callouts: CT, coffins, fountain and construction",
        `CT on B usually describes the defender-side approach that a smoke may block. Coffins is separate site-side cover and can require its own vision problem to be solved. Construction describes another connected area or route depending on the team's shorthand. Do not treat all defender access as a single “back site” location if you can identify which line is active. A partner choosing where to look needs that distinction before exposing the site.

A site entry call should report both the cleared slice and the remaining threat. “Close clear, coffins unchecked” helps a teammate direct their crosshair. “Site clear” after inspecting only the fountain's near side can cause everyone to turn away from a surviving defender. Make uncertainty explicit even when you think the defender probably rotated. An unverified assumption becomes much more dangerous once the objective carrier relies on it.

Walk the plant area and choose a hypothetical plant position. Ask which routes can see it, which cover blocks those views, and where an attacker can stand to support it without peeking every route. Move the imaginary plant and repeat. The best post-plant position is a relationship between the objective and surviving players, not an address that always wins the round.

For retakes, agree who takes the closest corner and who watches the longer line. Arriving at different moments can turn a two-player attempt into two solo entries. A short readiness call is more useful than a complicated plan neither player can execute while moving. Afterward, review whether the call described the cover the opponent actually used, or only the direction from which the first shot seemed to arrive.`,
      ],
      [
        "A callouts: apartments, balcony, pit and the street lanes",
        `Apartments creates an elevated approach and an exit onto the A-side fight. Distinguish an opponent inside apartments from one on balcony and one who has dropped. The height and line of sight change at each stage. A teammate aiming at the balcony after a confirmed drop may be reacting to an old call rather than missing an obvious opponent. Update movement as soon as it changes the next likely angle.

Pit is a valuable descriptive landmark, but the word alone may not identify the exact visible portion. From the site and approach lanes, inspect which edges reveal a head and which are hidden by cover. A player deep in pit can create a different clearing task from one near its edge. Avoid turning a single pre-aim point into a universal solution for every position in that area.

Teams often use short and long, lane and arch, or other variants for the A-side street approaches. Agree on the pair your group will use, including which physical path each means. If there is confusion during a round, add the landmark rather than arguing about the nickname. “Arch side” or “apartments exit” can restore a shared picture quickly.

Build an A exercise with one street approach and one apartments threat, initially occupied one at a time. Call which route is being held before a teammate enters. Then add a second attacker and practise trading without blocking the doorway. The useful outcome is whether both players understand their lane responsibility. A kill count alone will not show that one entry succeeded only because the defender happened to ignore the uncovered route.`,
      ],
      [
        "Learn smoke purposes before memorizing throws",
        `A key Inferno smoke should have a clear job. On B, common jobs include blocking the CT approach and cutting a coffins sightline. On A, a team may need to isolate an arch-side view, a library-side route or another defensive line depending on the entry. These are examples of sightline tasks, not a claim that every execute needs the same grenades. Decide where the attackers will move and which opponent view would stop that movement.

| Smoke job | What to inspect in practice | Frequent mistake |
| --- | --- | --- |
| B CT approach | Coverage from the actual crossing | Assuming the close site is cleared |
| B coffins line | Edges visible from the entry route | Treating it as the CT smoke |
| A defensive route | Which lane the entry needs isolated | Blocking a teammate's own trade |
| Temporary retreat | Whether it covers the fallback | Waiting until already exposed |

Test a throw by walking the intended crossing and then inspecting it from the defender side. A landing point alone is insufficient: the edge of the smoke and the height of a defender's view determine what remains visible. Do not call a lineup reliable because one grenade looked close from the thrower's position. Repeat with the same stance and input sequence, and observe whether the useful coverage is consistent.

Valve's input policy rejects certain multi-action binds; it also describes manually performed jump-throws. Learn the required manual motion instead of copying an old jump-throw alias. This article deliberately avoids unverified pixel coordinates, timing promises or claims of hands-on testing. Use [Mirage smoke practice](/guides/mirage-smokes) for the general verification habit, while keeping each map's geometry and landmarks separate.`,
      ],
      [
        "Make a small, actionable Inferno practice plan",
        `Choose one goal for a session: Banana information, A route calls, or a specific smoke job. Trying to learn all three at once makes it difficult to tell why a repetition failed. A missed throw can distract from a useful communication improvement; a won duel can hide a completely unclear call. Keep the chosen outcome observable and narrow enough to review between attempts.

- Walk the relevant route and name each branching landmark.
- Agree on aliases for toilets, lane names or site cover before playing.
- Select one smoke purpose and identify its intended crossing.
- Throw manually and inspect the smoke from both sides.
- Run equal attacker and defender blocks with fixed equipment.
- Record whether failure came from route knowledge, exposure or execution.

For Banana, start with the defender's position known. Once the attacker can clear it deliberately, permit a second position and compare the movement needed to avoid exposing both angles at once. For A, practise a partner calling apartments progression while you hold a street lane. Switch roles so both players understand what their call enables.

For utility, include a failed-throw response. If the smoke misses, stop and identify the exposed line rather than pretending the planned execute still has all its cover. A useful team plan has a fallback for incomplete utility. It need not be elaborate: wait, use another route, or preserve equipment when the original crossing is no longer acceptable. [CS2 practice commands](/guides/cs2-practice-commands) owns local setup details, and [counter-strafing](/guides/counter-strafing) covers the movement needed for deliberate first shots.`,
      ],
      [
        "Turn a round review into one concrete correction",
        `Review the earliest avoidable error. If a defender was called at coffins but the team interpreted the call as CT, correcting the vocabulary is more useful than asking the entry player to react faster. If the call was accurate but arrived after everyone crossed, timing is the issue. If the information was only a sound, the error may be presenting an inference as a confirmed sighting. Each diagnosis needs a different next repetition.

Write a short review in three parts: what was known, what the team decided, and what was still unobserved. For example, a player saw one top Banana, the team used utility to enter, but a close corner was never checked. The lesson is about the missing slice, not a claim that the opponent used an unbeatable spot. Re-run that slice with a partner before moving on to a new strategy.

Avoid stacking new settings changes on top of map learning. If sensitivity, keybinds and display settings all change during the same session, a missed throw or awkward turn becomes hard to diagnose. Keep controls familiar while learning the route, then change one setting only if a specific physical problem remains. This guide does not replace the existing general settings or aim-training pages.

For long-term recall, begin the next session without the written list. Walk Banana, name the B cover, and describe an A approach in your own words. Then check the places you could not recall. That is more useful than rereading every label while looking at the answer. Continue through the [FPS & aim topic](/guides/topics/fps-and-aim), and check current official updates before relying on old collision, clipping or grenade behavior.`,
      ],
      [
        "A short boundary for optional browser cash play",
        `These Inferno routes do not exist in [PvPStrike](/fps-1v1), our separate CS-style browser game. Native map practice and a browser duel solve different tasks. Compare [browser FPS games](/guides/browser-fps-games), [CS2 1v1 hosting and entries](/guides/cs2-1v1-for-money), and [crypto FPS terminology](/guides/crypto-fps-game) when choosing a format.

Hypothetical USD example A: $1 each creates $2; a 5% combined-pot FPS fee deducts $0.10, leaving $1.90 winner credit and +$0.90 net. Hypothetical USD example B: $5 each creates $10; $0.50 is deducted, leaving $9.50 credit and +$4.50 net. A loser loses the entry. These are calculations, not income projections or published match outcomes.

PvPStrike's local practice bot plays first to seven; cash series are best of thirteen. The published minimum entry is $1; actual entries depend on the lobby. Cash is 18+ where permitted, without a blanket US legality claim. Read the [FPS money hub](/guides/fps-for-money-hub) before entering and [fairness](/fairness) for the distinction between server validation and a promise of cheating immunity. A successful utility drill never establishes an earnings edge.`,
      ],
    ],
    faqs: [
      {
        q: "Which Inferno callouts matter most at first?",
        a: "Learn Banana, mid, second mid, apartments, balcony, pit, the two sites, CT and coffins. Connect each name to a route and nearby cover. Add team-specific street names only after agreeing on the physical lane each refers to. A clear small vocabulary helps more than many conflicting nicknames.",
      },
      {
        q: "Does taking Banana mean B is safe?",
        a: "No. You may have gained only part of the approach, while defenders still hold site cover or a close pocket. Call the last confirmed position and the space your team actually checked. Entering behind a smoke still requires clearing the visible site and accounting for threats the smoke does not remove.",
      },
      {
        q: "What are the key Inferno smokes to understand?",
        a: "Begin with the jobs: blocking B's CT approach, isolating a coffins view, and cutting the relevant A-side defensive route for your entry. Which throws are appropriate depends on your route and team plan. This guide does not supply tested pixel lineups or claim that one fixed set works for every round.",
      },
      {
        q: "Should CT and coffins use the same call?",
        a: "No. They identify different defensive sightlines on B, and confusing them can leave the intended crossing exposed. Walk both views in practice and have a teammate repeat what each label means. If local slang differs, add a physical landmark until everyone shares the same picture.",
      },
      {
        q: "Can I use an old jump-throw script for these smokes?",
        a: "Do not rely on it. Valve's published input policy restricts binds that combine certain movement and attack actions, and describes manual jump-throws as the intended skill. Learn the manual sequence and verify coverage in local practice. A script working in a modified private environment would not establish permission in matchmaking.",
      },
      {
        q: "How should a team respond when a smoke misses?",
        a: "Call the exposed line immediately and choose a fallback before crossing. Depending on the position, that may mean waiting, changing route or abandoning the attempt. Practise the failed-throw response as part of the drill. Pretending the planned cover exists often creates a larger problem than the original missed grenade.",
      },
    ],
    sources: [valveMaps, mapFixes, inputSource, valveNews],
    related: ["mirage-smokes", "cs2-practice-commands", "counter-strafing", "cs2-economy"],
  }),
  article({
    slug: "anubis-ancient-callouts",
    keyword: "anubis callouts",
    secondary: ["ancient callouts", "vertigo callouts", "csgo maps"],
    title: "Anubis and Ancient Callouts: Routes Without Mixups",
    description:
      "Learn distinct Anubis and Ancient callouts, avoid mixing their mid and site routes, and understand Vertigo labels without assuming current pool status.",
    h1: "Anubis callouts and Ancient routes: keep the maps separate",
    answer:
      "On Anubis, start with mid, bridge, water or canal, and the entrances toward A and B. On Ancient, build a separate route model around mid, donut toward A and the B approach through cave and ramp. Shared words such as temple, connector and main need a map and site attached; they are not interchangeable locations.",
    facts: [
      "Anubis and Ancient share some descriptive words but have different connections and clearing orders.",
      "Use route, site and direction when a nickname is ambiguous.",
      "Vertigo's vertical layout needs floor information, especially near stairs and ramps.",
      "A map's historical CS:GO presence does not establish its current CS2 queue or event status.",
    ],
    sections: [
      [
        "Build two small route graphs before adding slang",
        `The easiest way to confuse these maps is to learn their labels in one mixed list. Both have stone architecture, a mid area and site approaches that players describe with words such as main or temple. Those shared descriptions are weak memory anchors. Learn each map as a separate graph: spawn, branching area, approach, site and defender return route. A label becomes useful when you can name what lies before and after it.

For Anubis, trace mid and bridge, then the water or canal route and the entrances toward each site. For Ancient, trace mid into donut toward A and separately follow the B-side approach through its relevant cave and ramp areas. Do not infer a complete route from those short summaries; walk it in your installed map and identify where cover blocks the next view. The purpose is to create a reliable sequence, not to memorize an imagined overhead.

Keep notes on separate pages with the map name written above the route. Draw only the connections you have actually walked. Add a small arrow for the direction of a possible push, then name the next angle a teammate would need to watch. This makes the note useful in a round rather than merely decorative.

Valve's official overview and map updates establish the native CS2 context and record changes to locations such as Anubis connector and Ancient donut. They do not publish a complete universal slang dictionary. The practical labels here should be agreed with your teammates and checked against current geometry, especially when an older CS:GO diagram uses a name that no longer describes the artwork clearly.`,
      ],
      [
        "Anubis: mid and bridge are information routes",
        `On Anubis, learn mid and bridge by looking at their exits rather than treating them as isolated duel spots. A player seen near the bridge may threaten more than the angle where the first shot occurred. The call should identify where the opponent is going if that movement is visible. “One mid moving toward the A connection” is useful; “mid clear” after seeing only the nearest angle can create a false sense of safety.

Walk the approach in both directions. From the attacking side, identify the first cover and the next exposed line. From the defending side, see how much of an attacker becomes visible before the attacker sees your holding position. You do not need a measured timing claim to learn that the two viewpoints differ. Reverse-view practice is a way to understand the geometry, not proof that a particular peek is always favorable.

| Anubis region | Useful extra detail | Common communication loss |
| --- | --- | --- |
| Mid | Exit or direction of travel | Treating a broad region as one angle |
| Bridge | Crossing, holding or dropping | Reporting the old position after movement |
| Water or canal | Which site approach it threatens | Using water for every lower route |
| Site main | A or B plus depth of entry | Saying main without a site |

When contact breaks, update the certainty instead of inventing a destination. An opponent can pause behind cover or reverse. A teammate defending another route needs to know when the sighting became stale. That habit is particularly useful on maps where routes cross at different heights or connect through short enclosed sections.`,
      ],
      [
        "Anubis: water, site entrances and post-plant language",
        `Water or canal labels are broad enough that direction matters. A call should say whether the player is near the mid connection, moving toward a site entrance or retreating from it. Avoid treating sound in the area as a confirmed model location. If you have only audio, say “steps near water” and retain uncertainty about the precise corner. A teammate can prepare for several possibilities without being sent toward an invented exact position.

At each site, identify the main attacking entry, nearby close cover, the common defensive connections and a plausible plant area. Say the site before a generic label: “B main” is safer than “main” when players are fighting at both ends of the map. If a group uses temple for a defensive area, point out which site and physical structure it means before the first round. Do not import Ancient's meaning merely because the same word sounds familiar.

Use post-plant practice to make the labels concrete. Choose a hypothetical plant and have a partner approach from one return route. The attacker identifies which piece of cover gives a view of the objective and which nearby corner remains vulnerable. Change the return route and repeat. This shows why a post-plant call needs both position and the line being protected.

A smoke on an entrance does not clear the site or reveal a hidden defender. Treat it as one part of a route plan. Inspect what remains visible from the actual crossing, then describe the unchecked pocket to a partner. This article deliberately avoids unverified lineup coordinates or claims about a current professional default. Its aim is usable navigation and clear communication under incomplete information.`,
      ],
      [
        "Ancient: distinguish mid, donut and A",
        `Ancient needs its own mental reset. Begin at mid and locate the route commonly called donut toward A. Donut is a recognizable connector area; it is not a name for every indoor turn on the map. A teammate holding A needs to know whether an opponent is approaching donut, inside it, or already exiting toward the site. Those stages change which angle is most urgent and whether a second player can still trade safely.

Walk A from the main attacking entrance and from the donut side. Compare the first visible cover and the threats that remain hidden from each route. A clearing sequence that works from main can leave a different close corner unchecked from donut. Do not turn one successful duel into a rule that the whole site should always be cleared in the same order. Your entry lane determines what can see you first.

Make a short paired drill. One player holds a defined A-side position while the other enters from main. Repeat from donut with the same equipment. Then reverse roles. After each block, describe which view exposed a second angle earlier. That explanation is more useful than declaring one player the better aimer based on two different information problems.

For calls, combine the map's distinctive landmark with plain direction. “Donut, exiting A” is clearer than a regional nickname nobody else knows. If your teammate uses a different name, point out the location between rounds and agree on a shared term. During the round, prioritize a physical description over a vocabulary dispute. The objective is to coordinate the next angle, not win an argument about which community's slang is correct.`,
      ],
      [
        "Ancient: cave, B ramp and defender approaches",
        `On the B side, learn cave and ramp as distinct pieces of the approach rather than alternate names for the site. Identify where the routes join or expose overlapping angles. An attacker inside cave may create pressure without having crossed onto B. A player reaching ramp can still face site cover and defender return routes. Say how far the player progressed and which view you actually have.

Teams may use short, long, lane or other terms for parts of the B-side fight. Those labels are especially easy to mix with names from other maps. Pair them with a known physical landmark during practice and put the agreed version in a short team note. If a label covers a wide area, add the nearest cover instead of adding more obscure slang.

| Ancient call | Minimum clarification | Why it matters |
| --- | --- | --- |
| Donut | Toward mid or toward A | Distinguishes pressure from site entry |
| Cave | Inside, entrance or exit | Prevents a premature B rotation |
| B ramp | Approach or already crossing | Changes the defender's next angle |
| Temple or defensive route | Exact site and local meaning | Avoids borrowing Anubis vocabulary |

Practise a B clear with the nearest threat known, then allow one alternate defender position. Require the attacker to name the unchecked angle before moving. That small rule encourages deliberate exposure and makes it obvious when a player wins despite a bad route. A successful shot does not erase the fact that a second angle was left open to chance.`,
      ],
      [
        "Vertigo and older CS:GO map names need context",
        `Vertigo deserves a separate vocabulary because height changes the meaning of direction. Start with A ramp, the site, the B-side stairs and the routes between levels. Add the floor when a player could be above or below the teammate receiving the call. “Stairs, coming up” can be actionable; “behind you” depends on the listener's view and can be wrong as soon as they turn.

Do not use Vertigo as a substitute route model for Nuke. Both contain vertical play, but their transitions and objective geometry differ. A ramp on one map does not imply the same fallback or sightline as a ramp on another. Walk the current map before adopting a clearing pattern from an old clip. Cover, railings and clipping can change while players continue using a familiar historical name.

Searches for “CSGO maps” often combine several questions: a remembered map, access to an old version, current CS2 matchmaking, or a custom-server session. Name which question you are answering before following a download or server guide. A historical appearance in CS:GO is not evidence of present selection in CS2, and a Workshop recreation is not automatically the same build as an official map.

This article makes no current Active Duty, Premier or tournament pool assertion for Anubis, Ancient or Vertigo. The [CS2 map-pool guide](/guides/cs2-map-pool) owns that comparison. Verify the live client and the specific event rulebook when availability matters. For learning, choose a supported local or community workflow and keep the exact map version attached to any notes about routes or utility.`,
      ],
      [
        "A recall checklist that prevents cross-map errors",
        `Use separate short sessions before mixing maps. First walk one route without notes and name the connected areas. Then ask a partner to give a label and walk to it without looking at an overhead answer. Finally make the partner describe an opponent's movement and say which next angle you would cover. This tests route understanding, not just whether a word looks familiar.

- Put the map name above every route note.
- Learn one site approach and one defender return path together.
- Attach A or B to generic labels such as main and temple.
- Add floor and direction where vertical routes can confuse the call.
- Mark the moment a live sighting becomes only a last-known position.
- Revisit the same route from the defender's viewpoint.

When switching from Anubis to Ancient, take a brief orientation walk before a serious practice block. Name three map-specific landmarks aloud. This is a simple reset that reduces the temptation to use the previous map's route expectations. Do not change sensitivity or keybinds at the same time: a control change makes it harder to tell whether hesitation came from navigation or input.

Review one wrong call by drawing the route the speaker intended and the route the listener understood. Fix the word that caused the split. Sometimes the solution is a site prefix rather than a new nickname. [Mirage callouts](/guides/mirage-callouts) shows another route vocabulary, while [CS2 practice commands](/guides/cs2-practice-commands) handles the local-session tools. The [FPS & aim topic](/guides/topics/fps-and-aim) keeps these focused guides together without pretending every map uses the same angles.`,
      ],
      [
        "Native map knowledge and a separate browser entry",
        `None of these native maps is a [PvPStrike](/fps-1v1) map. Our CS-style browser game has its own arena and rules, so route names and Workshop files do not transfer. For a format comparison, read [browser FPS games](/guides/browser-fps-games), [CS2 1v1 for money](/guides/cs2-1v1-for-money) and [crypto FPS games](/guides/crypto-fps-game).

Hypothetical USD example A: $1 per player gives a $2 pot; the published 5% combined-pot FPS fee is $0.10, so winner credit is $1.90 and net change +$0.90. Hypothetical USD example B: $5 per player gives $10; the fee is $0.50, winner credit $9.50 and net change +$4.50. Losing costs the entry; neither example describes earnings or a settled match.

PvPStrike practice is first to seven against a local bot; cash series are best of thirteen. The published $1 minimum does not guarantee a lobby entry is available. Cash requires age 18+ and permitted access, with no blanket US state legality claim. Use the [FPS money hub](/guides/fps-for-money-hub) for that decision and [fairness](/fairness) for validation boundaries. An authoritative server checks inputs, hits and results; it does not guarantee cheat-free play.`,
      ],
    ],
    faqs: [
      {
        q: "Which Anubis callouts should I learn first?",
        a: "Begin with mid, bridge, water or canal, and the main routes toward A and B. Walk the connections and inspect each exit from both sides. Add specific site cover after those routes are reliable. Use a site prefix with generic words so a teammate does not confuse one main entrance with another.",
      },
      {
        q: "Which Ancient callouts are most distinctive?",
        a: "Donut toward A and cave and ramp on the B side are useful anchors for a beginner's route model. Learn where they connect before adding regional shorthand. A call should distinguish an opponent inside an approach from one already entering the site, because the defender's next angle changes with that movement.",
      },
      {
        q: "Can Anubis and Ancient share the same callout sheet?",
        a: "They can share a document, but keep separate map diagrams and route lists. Generic terms such as temple, main and connector can describe different physical places. Mixing them into one unlabeled list encourages the wrong mental route. Attach the map and site to examples whenever ambiguity is possible.",
      },
      {
        q: "How should I learn Vertigo callouts?",
        a: "Start with the major approaches, including A ramp and the B-side stairs, then identify the level and direction of travel. Walk the transitions in the current map build. Do not assume that vertical terminology from Nuke describes the same route or that an old CS:GO diagram proves present CS2 geometry.",
      },
      {
        q: "Are all three maps currently in the same competitive pool?",
        a: "This guide does not assert that. Premier, other official modes, community servers and event veto lists can differ. Check the current client or organizer rules for the exact competition. A route guide can remain useful for supported practice without serving as evidence of live queue availability.",
      },
      {
        q: "What is the fastest way to correct a mixed-up call?",
        a: "During the round, add the site and a physical landmark in plain language. Between rounds, compare what the speaker meant with what the listener pictured, then agree on one label. Correcting the shared meaning is more useful than insisting that one regional nickname is universally authoritative.",
      },
    ],
    sources: [valveMaps, mapFixes, valveNews],
    related: ["cs2-map-pool", "mirage-callouts", "cs2-practice-commands", "dust-2-callouts"],
  }),
  article({
    slug: "cs2-surf",
    keyword: "cs2 surf",
    secondary: ["surf maps cs2", "cs2 bhop", "bhop", "kz cs2"],
    title: "CS2 Surf: Ramp Basics, Bhop and KZ Practice",
    description:
      "Learn how CS2 surf works, choose compatible maps and servers, and separate ramp practice from bhop and KZ without relying on outdated commands.",
    h1: "CS2 surf: learn the ramp before chasing a time",
    answer:
      "To surf in CS2, use a compatible surf map or community server, land on the side of a sloped ramp, hold the strafe direction toward its face and steer smoothly along it. Start with one easy segment. Surf, bhop and KZ are related movement activities, but their map rules, timers and allowed assistance can differ substantially.",
    facts: [
      "A Workshop subscription supplies a map; it does not guarantee the server settings or plugins the map expects.",
      "Difficulty tiers and records belong to a community's ruleset, not a universal Valve ladder.",
      "A sudden stop can come from execution or a map/server issue; compare the same segment before deciding.",
      "Movement automation allowed on a custom server is not automatically permitted in official matches.",
    ],
    sections: [
      [
        "Choose a working environment before changing movement",
        `Surf depends on a combination of map geometry and movement rules. A map can load successfully while behaving differently from the community server where a demonstration was recorded. Before changing your inputs, read the creator's description and the server's rules. Identify whether the session is skill surf, combat surf, a staged course or a continuous linear route. Those distinctions explain what success means and whether interruptions from other players are part of the intended game.

Valve opened the CS2 Maps Workshop for offline subscriptions and community-server hosting. That establishes the distribution workflow, not a promise that every historical Source map or port works indefinitely. Creator pages reviewed for this guide include reports from creators about ramp problems after updates. Treat those as compatibility warnings for the named versions, rather than claiming all surf is currently broken or all servers have already fixed it.

Start with a maintained, clearly documented beginner course and a server whose rules are understandable. Check whether it advertises a current compatible map version, expected movement style and any server-side fixes. Do not install an unknown executable because a comment says it is necessary to make a ramp work. Server administrators manage their plugins; an ordinary player should not need to bypass account protections to join a movement course.

If using a local map, inspect its instructions before assuming that default competitive settings provide the intended experience. If instructions are missing or compatibility is unclear, select another map or ask its maintainer. The first useful accomplishment is a reproducible practice environment, not a faster time recorded under unknown settings.`,
      ],
      [
        "The first ramp: contact, strafe and a smooth view",
        `Picture a triangular ramp with a slope on either side. You want to travel along a sloped face, not land flat on the top ridge or fall off the low edge immediately. When the face is on your right, the usual starting input is to strafe right toward it; when it is on your left, strafe left. Keep forward movement out of the initial exercise unless the course's own instruction specifically calls for it. Extra inputs make the first cause of a failed attempt harder to identify.

Steer with gradual mouse movement. A sharp turn can redirect your travel abruptly or put you into the ramp at an unhelpful angle. Begin by trying to stay attached for a short distance rather than launching for maximum speed. Look along the intended path and notice whether you drift toward the ridge, descend too far, or leave the surface before the next landing. Those observations give you a correction for the next attempt.

Split learning into contact and exit. First repeat the same entry until you can ride a predictable portion of the face. Then choose a clear departure point and aim for a broad landing area. Trying to solve entry, speed, transfer and the entire course in one attempt creates too many possible causes of failure. A short successful segment is useful even if the timer never reaches the finish.

Do not interpret this as a universal physics prescription for every server. Community configurations can change acceleration, caps and assistance. Use the map's own instruction for the exact environment, and avoid copying numeric movement settings from an unrelated older game. The transferable skill is seeing how the strafe input, view direction and contact point affect the line.`,
      ],
      [
        "Speed control and transfers between ramps",
        `Speed is a resource only when you can spend it on the next transition. A fast exit that overshoots the next ramp is less useful than a slower controlled line that completes the segment. Practise choosing the landing area first, then shaping the preceding ramp ride toward it. That reverses the beginner habit of accumulating speed and deciding where to go only after leaving the surface.

Look at entry height, exit height and the distance to the next face. A line that drops earlier may gain speed while leaving less height for the transfer. A higher line may preserve room to aim the next landing but require a cleaner turn. These are practical tradeoffs to observe in your own environment, not measured claims about an ideal trajectory. Make one change at a time and compare the same segment.

| Ramp problem | First variable to inspect | Useful next attempt |
| --- | --- | --- |
| Fall off immediately | Contact side and strafe direction | Repeat only the entry |
| Hit the ridge | Entry height and view turn | Approach a lower part of the face |
| Miss next ramp wide | Exit direction | Aim for a larger landing zone |
| Arrive without enough height | Departure line | Preserve height before transfer |

Use the course's checkpoint or restart features if available under its rules. Practising the hard transfer directly can be more productive than repeating a long easy opening every time. For a valid full run, follow the server's timer rules afterward. Assisted practice and ranked completion are different records; keeping them separate makes progress easier to interpret.`,
      ],
      [
        "Surf, bhop and KZ train different movement problems",
        `Bhop refers to chaining jumps while preserving useful movement through landing and takeoff. The exact timing and assistance depend on the server. Some community environments offer automatic jumping; others require a particular input style or define separate categories. Do not assume a clip's sustained chain can be reproduced in ordinary official matchmaking under the same conditions. A successful custom course says something about that course and ruleset.

KZ courses emphasize controlled jumps, routes and technical movement over obstacles. They can require reading ledges, setting up takeoff and judging landing position. Surf emphasizes riding sloped faces and transferring between them. All three reward smooth coordination, but getting better at one does not automatically solve the others. In particular, a movement course does not replace stopping before an accurate rifle shot in a combat duel.

| Activity | Main recurring task | Fair comparison needs |
| --- | --- | --- |
| Skill surf | Ramp line and transfer | Same course and movement rules |
| Bhop course | Landing and repeated takeoff | Same assistance category |
| KZ course | Precise jump and route choice | Same route and checkpoint rules |
| Combat practice | Movement plus weapon accuracy | Same game and combat conditions |

Choose the activity based on the failure you want to improve. If you repeatedly overshoot a landing, a short controlled jump course may be useful. If a ramp transfer is the issue, stay with a surf segment. If you miss first bullets while moving in a match, use [counter-strafing](/guides/counter-strafing). Do not call a movement time a complete measure of combat skill.`,
      ],
      [
        "Find surf maps without presenting an untested ranking",
        `Search the CS2 Workshop for the activity and read the item page, not only the title. Check that it targets CS2, identify the creator or port maintainer, read the description and recent change notes, and inspect any dependency instructions. A familiar name from CS:GO or Counter-Strike: Source does not guarantee a compatible port. Likewise, a large subscription count does not establish current playability.

The CS2 Surf initiative's own collection describes maps ported for CS2, including a beginner-oriented staged course. Individual creator pages such as surf_me and surf_ski_2_classic include maintainer comments warning about compatibility problems in particular versions. These are useful examples of why creator documentation matters, not recommendations that those versions are currently playable. Automated page banners can also be unclear, so verify the live item page and maintainer's latest instructions before subscribing.

Prefer a small download set at first. One working beginner course gives you a stable comparison for technique changes. Downloading many courses simultaneously creates uncertainty about which map version, server configuration or restart rule caused a different result. Keep the item's identity and the server name with your practice note so you can return to the same environment later.

This page does not claim a tested list of the best surf maps. Its selection criteria are compatibility, clear instructions, manageable difficulty and a useful reset structure. The [CS2 aim-map guide](/guides/cs2-aim-maps) owns aim-training recommendations; surfing belongs to a different practice category. When the goal is a community session, check the server rules as carefully as the map description.`,
      ],
      [
        "Diagnose a ramp stop without blaming every mistake on bugs",
        `When the model stops unexpectedly, first ask whether it happens at the same physical place. Repeat the segment with the same entry line and then a slightly different one. If only one rough approach fails, technique remains a plausible cause. If several clean approaches stop at the same seam, a map or server issue becomes more plausible. This is a practical observation method, not proof of the engine's internal cause.

Compare another maintained course under the same server rules if available. If the problem follows one map, preserve its item identity and describe the exact segment to the maintainer. If it happens across maps, record the server, settings category and visible network symptoms. A video can help a report if you make one yourself, but this article includes no claimed test recording or screenshot.

Do not fix movement by pasting a large unknown configuration pack. A pack may change binds, movement assistance or game settings without making the original issue reproducible. Keep a backup of your own configuration and avoid commands whose role you cannot explain. A workaround allowed in a private course does not establish permission to use automation on official servers.

Distinguish a visible frame hitch from a collision stop. If the entire view freezes, investigate rendering or system load. If the view remains smooth but movement catches at a repeatable seam, describe that physical behavior. Startup tweaks should not become a substitute for identifying the symptom. Report what happened rather than declaring every failed landing a universal CS2 defect.`,
      ],
      [
        "A short practice block with an honest progress measure",
        `Choose one entry and one transfer. Spend the first attempts keeping contact, then add the exit only after the ramp ride is predictable. Count successful landings out of a fixed block rather than remembering only the best run. A personal best can improve while typical control remains unchanged, particularly when a single lucky line carries the attempt farther than usual.

- Confirm the map, server and assistance rules before starting.
- Choose one short segment with a clear reset point.
- Repeat the same entry until the contact is controlled.
- Change only the exit direction or entry height for the next block.
- Record clean landings, not just the farthest attempt.
- Finish with an unassisted run if that is your intended category.

Write the failure in physical terms: hit ridge, lost face, exited too wide, or landed too low. Avoid vague notes such as “bad movement.” A specific description leads to a specific experiment. If fatigue makes turns abrupt or the same error repeats without a new idea, stop the block and return later rather than collecting more low-quality attempts.

Use a separate combat warm-up when returning to ordinary matches. Surf inputs and course assistance can encourage habits that do not fit accurate gunfire. Revisit stopping, target acquisition and the game's actual movement rules. The [FPS & aim topic](/guides/topics/fps-and-aim) links those focused drills, while [CS2 practice commands](/guides/cs2-practice-commands) handles local setup. Keep a movement course as a useful activity in its own right, without promising rank improvement or faster reaction times.`,
      ],
      [
        "A browser duel is a separate activity and entry decision",
        `[PvPStrike](/fps-1v1) is a separate CS-style browser shooter, not a surf server, KZ course or CS2 map host. Compare the formats in [browser FPS games](/guides/browser-fps-games) and [CS2 1v1 for money](/guides/cs2-1v1-for-money); [crypto FPS games](/guides/crypto-fps-game) explains payment terminology without assuming token rewards.

Hypothetical USD example A: a $1 entry from each player makes $2; PvPStrike's 5% combined-pot fee is $0.10, winner credit $1.90 and winner net change +$0.90. Hypothetical USD example B: $5 each makes $10; fee $0.50, credit $9.50 and net change +$4.50. The loser loses the entry, and these examples promise no earnings.

Local practice against a bot is first to seven; cash series are best of thirteen. The published minimum stake is $1, but check the lobby for available entries. Cash requires age 18+ where permitted, not merely movement skill or access to a browser. Read the [FPS money hub](/guides/fps-for-money-hub) and [fairness explanation](/fairness). Server checks on inputs, hits and results do not guarantee immunity from cheating, and a surf record establishes no cash-match advantage.`,
      ],
    ],
    faqs: [
      {
        q: "How do I start surfing in CS2?",
        a: "Choose a compatible beginner map or community server, read its rules, then practise riding one sloped face. Strafe toward the ramp face and steer smoothly along it. Start with stable contact before attempting transfers. Default competitive settings may differ from the environment expected by a particular surf course.",
      },
      {
        q: "Which surf maps should I download first?",
        a: "Choose one maintained beginner course with clear CS2 instructions, recent creator information and convenient resets. This guide does not rank untested maps or promise that a historical port still works. Inspect the live item page and server documentation; a familiar title and many subscriptions do not prove current compatibility.",
      },
      {
        q: "Why do I suddenly stop on a ramp?",
        a: "It can be an entry or steering mistake, a geometry seam, or a server and map compatibility problem. Repeat the same segment and compare a controlled alternate line. Report the exact map version and location if a stop is reproducible. Do not assume every failed run is a bug or every creator warning is still current.",
      },
      {
        q: "Is CS2 bhop the same as surf?",
        a: "No. Bhop focuses on repeated jumps and landings, while surf focuses on riding slopes and transferring between them. Servers can apply different assistance and movement settings. Compare times only within the same rules and category; a custom auto-jump course does not represent ordinary matchmaking movement.",
      },
      {
        q: "What does KZ mean in this context?",
        a: "KZ describes community movement courses built around technical jumps, routes and controlled landings. Its task differs from ramp surfing and from rifle combat. Check the course's checkpoint and timer rules before comparing results. A completion under assisted practice conditions should not be presented as an unassisted ranked run.",
      },
      {
        q: "Can I use surf automation in official matches?",
        a: "A custom server's rules do not grant that permission. Valve's published input policy restricts automation that combines certain player actions, including hardware-assisted behavior. Keep course-specific assistance within its permitted environment, disable prohibited automation before official play, and learn the manual inputs needed for the game you actually join.",
      },
    ],
    sources: [
      workshopSource,
      inputSource,
      {
        label: "CS2 Surf initiative: creator-maintained Workshop collection",
        url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3092967649",
      },
      {
        label: "surf_me maintainer: map description and compatibility comments",
        url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3248211716",
      },
      {
        label: "surf_ski_2_classic porter: compatibility warning",
        url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3094395848",
      },
    ],
    related: ["counter-strafing", "cs2-aim-maps", "cs2-launch-options", "cs2-practice-commands"],
  }),
  article({
    slug: "cs2-binds",
    keyword: "cs2 jump throw bind",
    secondary: ["cs2 binds", "cs2 radar", "cs2 hud"],
    title: "CS2 Jump Throw Bind Rules, Radar and HUD Setup",
    description:
      "Understand CS2 jump-throw restrictions, choose simple binds, and arrange radar and HUD information with a reversible setup and manual practice plan.",
    h1: "CS2 jump throw bind: use manual inputs and clear controls",
    answer:
      "Do not rely on an old CS2 jump-throw bind that combines jump and grenade-release actions. Valve's published policy restricts certain multi-action inputs and describes manual jump-throws as the intended method. Use separate manual actions, keep ordinary binds simple, and arrange radar and HUD information so you can read it without obscuring the fight.",
    facts: [
      "A script working in private practice does not establish permission on an official server.",
      "Keyboard firmware can automate behavior even when the in-game bind looks simple.",
      "Radar scale and HUD size solve information and readability problems, not weapon accuracy.",
      "Back up controls and change one binding at a time so mistakes are reversible.",
    ],
    sections: [
      [
        "What changed for jump-throw binds",
        `Many older Counter-Strike guides combine jumping and releasing a grenade into a single bound action. Valve's August 19, 2024 policy drew a line around automating multiple player actions, and the accompanying notes said binds containing more than one of a listed group of movement and attack commands would be ignored by default. The same announcement explains that jump-throws can be performed manually by jumping and throwing quickly. That is the appropriate starting point for a modern setup.

Do not interpret a console workaround, alias chain or private-server setting as an exception you can carry into official play. A local environment may allow behavior that the official rules reject. Likewise, a hardware feature can automate opposing movement inputs even if your configuration file contains no conspicuous script. Review keyboard software and device profiles as well as the in-game controls.

This guide does not provide a bypass or a replacement macro. The useful task is to make legal manual input comfortable and repeatable. Place jump and grenade controls where your hand can reach them without an awkward stretch, practise the sequence in local play, and inspect the resulting throw. If the sequence is inconsistent, simplify the hand motion before adding more software.

Policies and client behavior can evolve, so the live official notes remain the authority. The safe distinction is between rebinding an ordinary action and automating several gameplay actions from one input. A setting that seems convenient is not automatically acceptable because a video calls it essential or because an old professional configuration once contained something similar.`,
      ],
      [
        "Build a small bind plan around physical tasks",
        `Start with the tasks your fingers need to perform during a round: movement, jump, crouch, interact, reload, weapon selection, utility selection and communication. Keep frequently combined manual tasks on controls you can reach together. If selecting a grenade requires releasing a movement key at the wrong moment, the layout has a physical conflict even if each individual bind is valid. Solve that conflict before adding specialist shortcuts.

Use the game's keyboard and mouse settings for ordinary actions when possible. The interface makes the current assignment visible and reduces the chance of overwriting something unintentionally. If you use the console, inspect the existing assignment and understand what the command does before changing it. Do not paste a full configuration from an unknown download just to obtain one useful control.

| Control choice | What to test | Reason to revise it |
| --- | --- | --- |
| Jump position | Reach during movement | Hand must leave its stable position |
| Utility selection | Select intended item without looking | Wrong item appears under pressure |
| Voice key | Speak while holding an angle | Movement or aim becomes awkward |
| Interact key | Use doors and objective reliably | Accidental input conflicts recur |

Keep one action's purpose easy to remember. A clever arrangement that saves a finger movement but produces frequent wrong inputs is not an improvement. During the first practice session, write down the mistake rather than changing the binding immediately after every death. A repeated physical conflict justifies revision; a single unfamiliar attempt may simply need deliberate practice.`,
      ],
      [
        "A reversible workflow for settings and configuration files",
        `Before editing controls, save a readable note of the relevant settings and keep a backup of any configuration file you intend to change. The backup should live somewhere you can identify later, with the date and purpose in its name. Do not assume synchronization will preserve every version of a mistake or that another downloaded configuration will restore your original layout.

Change one task, launch local practice and test both press and release behavior. A control can appear to work on press but leave a held action active if the configuration mishandles release. Walk, stop, switch equipment, use the control and then return to normal movement. Exit and relaunch once to confirm that the intended setting persists. This catches a setup that only seemed correct during one console session.

Separate personal controls from practice-session configuration. A practice file may contain server or environment commands that are unnecessary for ordinary play. Keeping the purposes separate makes it easier to explain what loads at startup and what applies only to a local drill. The [practice-command guide](/guides/cs2-practice-commands) owns the latter workflow; this page focuses on choosing and verifying controls.

If a key is already assigned, decide what should happen to the displaced action before overwriting it. Losing interact or voice unintentionally may not become obvious until a live round. Restore through the in-game controls if the result is confusing, then revisit the small change with a clearer purpose. A configuration is successful when you can account for its behavior, not when its file contains the largest number of lines.`,
      ],
      [
        "Practise a manual jump-throw as a repeatable sequence",
        `Choose a local map and an uncomplicated throw location. Use the same starting position, stance, aim reference and grenade type for each repetition. Perform the manual jump-and-release sequence, then inspect where the grenade lands and what the smoke or other utility actually does. The landing is part of the test; a visually similar hand motion does not prove useful coverage.

Keep the first block short and count useful throws out of a fixed number of attempts. Do not report only the best result. If a throw misses, classify the failure: starting position moved, aim reference changed, release timing differed, or a collision affected the grenade. That classification tells you which variable to stabilize. Repeating without a hypothesis mostly builds familiarity with inconsistency.

Then practise the sequence while carrying the equipment and using the movement state required by the intended lineup. A standing throw and a moving throw are different tasks. Avoid introducing an extra step simply because a clip contains one; each added action creates another variable to learn. A teammate should know what cover the throw is intended to provide and what the fallback is if it misses.

This is a practice protocol, not a claim that a particular lineup has been tested by the publisher. It does not promise exact timing, success rates or pixel coordinates. Verify the current map build and server rules. Learning a manual throw also does not make every combination of actions permissible: consult Valve's current input guidance rather than assuming an alias is allowed if you can perform its result manually in theory.`,
      ],
      [
        "Radar: choose the information you need during a glance",
        `Radar is useful when it answers a specific question quickly: where a teammate is, which route is uncovered, or where the last information appeared. A very tight view can show nearby geometry clearly while hiding the broader rotation. A very wide view can reveal the team shape while making close details small. Choose a balance based on whether your current errors are local orientation or missing a distant change.

Test scale, rotation, centering and size through the options exposed in the current client. Do not assume a numeric setting copied from someone else's monitor produces the same readable result on yours. Display size, resolution, viewing distance and eyesight change what can be recognized. The purpose is to get usable information from a brief glance, not to reproduce an aesthetically familiar screenshot.

| Radar decision | More local detail favors | More map context favors |
| --- | --- | --- |
| Scale | Checking nearby route shape | Seeing teammate distribution |
| Visible area | Small immediate decisions | Planning a rotation |
| Icon readability | Recognizing close positions | Tracking several distant teammates |
| Rotation preference | Aligning view and movement | Maintaining a fixed mental map |

For a test, walk a familiar route and glance only at safe pauses behind cover. Ask whether you can name the nearest teammate and an uncovered lane without studying the display. If you need a long look, improve readability or simplify the task. Radar is a support channel; it should not make you stare away from a likely opponent at the moment of contact.`,
      ],
      [
        "HUD: make health, ammo and round information readable",
        `HUD changes should solve a reading problem you can name. If ammunition is hard to read at your normal viewing distance, adjust the relevant scale or layout options available in the client and recheck it in motion. If a bright element competes with target visibility, examine its position and contrast. Do not hide useful information simply because a minimal screen looks cleaner in a still image.

Identify the moments when you need each item. Ammo matters before a likely follow-up fight; health informs whether exposing yourself to another angle is reasonable; round time can change whether a slow route is still possible. A good layout lets you retrieve that item at a safe moment and return attention to the scene. Trying to monitor every number continuously is unnecessary and can make the display feel more distracting than it is.

Test with the actual resolution and display arrangement you use. A screenshot viewed at a different scale cannot establish comfort. Record only what you observed: a number became easier to read, an element overlapped an important area, or a glance took too long. Do not translate those observations into invented frame-rate gains or a claim that the layout improves reaction time.

Keep crosshair selection separate from this task. The existing [crosshair-code guide](/guides/cs2-crosshair-codes) owns importing and evaluating reticles. This page concerns controls and information placement. Likewise, general graphics tuning belongs in [CS2 settings](/guides/best-cs2-settings). Dividing those tasks keeps a HUD experiment from turning into a wholesale configuration change whose effects you cannot distinguish.`,
      ],
      [
        "A controls audit before joining a match",
        `Use a short local route that includes moving, stopping, crouching, jumping, selecting a weapon, selecting utility and using voice. Rehearse it once without an opponent, then repeat with a simple target task. The aim is to find conflicts while the session is free of competitive pressure. If your hand position breaks during one combination, note the exact combination rather than saying the entire setup feels wrong.

- Back up the controls you intend to change.
- Review keyboard software for movement or attack automation.
- Change one ordinary action and test press and release.
- Perform manual grenade inputs under the intended practice rules.
- Check radar and HUD readability at the actual display distance.
- Relaunch and confirm the controls persist as expected.

If something goes wrong in a match, restore a known comfortable layout before experimenting further. Do not troubleshoot several new binds while teammates depend on your movement. Afterward, reproduce the problem locally and identify whether it came from a key conflict, device profile, startup file or unfamiliar finger placement. Each cause needs a different fix.

Give a useful change time to become familiar, but do not endure pain or persistent awkwardness to copy another person's layout. Hand size and device shape differ. There is no universal best bind set established here and no professional endorsement. The [FPS & aim topic](/guides/topics/fps-and-aim) organizes separate practice problems so you can keep control changes narrow and judge them by the task they actually improve.`,
      ],
      [
        "CS2 configuration does not configure a browser duel",
        `[PvPStrike](/fps-1v1) is a separate CS-style browser game. Steam binds, CS2 radar variables and HUD configuration files do not configure it. Read [browser FPS games](/guides/browser-fps-games) for access differences, [CS2 1v1 for money](/guides/cs2-1v1-for-money) for hosting boundaries and [crypto FPS games](/guides/crypto-fps-game) for payment terminology.

Hypothetical USD example A: $1 each makes a $2 pot; PvPStrike's 5% combined-pot fee is $0.10, leaving $1.90 credit and +$0.90 net for the winner. Hypothetical USD example B: $5 each makes $10; the $0.50 fee leaves $9.50 credit and +$4.50 net. Losing costs the entry. Neither arithmetic example is evidence of earnings.

Local bot practice is first to seven; cash series are best of thirteen. The published minimum is $1, while available entries must be checked in the lobby. Cash requires age 18+ where permitted, without a universal US state legality claim. Use the [FPS money hub](/guides/fps-for-money-hub) and [fairness explanation](/fairness) before accepting an entry. Server validation of inputs, hits and results does not guarantee cheating immunity, and a convenient bind establishes no financial advantage.`,
      ],
    ],
    faqs: [
      {
        q: "Does the old CS2 jump-throw bind still belong in my config?",
        a: "Do not rely on a bind that combines jump and grenade-release actions. Valve's published input restrictions cover certain multi-action binds, while its announcement describes manual jump-throws. Remove obsolete scripts from your normal setup and learn the separate manual actions in a permitted practice environment. Consult current official notes if behavior changes.",
      },
      {
        q: "What are the best CS2 binds for a beginner?",
        a: "A small set that makes ordinary actions comfortable and predictable. Prioritize movement, jump, interact, weapon and utility selection, and voice. Test combinations your hand must perform together, back up the original layout and change one thing at a time. This guide does not claim a universal professional configuration.",
      },
      {
        q: "Can keyboard firmware cause an input-policy problem?",
        a: "Yes, automation can come from device software or firmware rather than a visible in-game alias. Valve's policy explicitly discusses hardware-assisted behavior. Review the active keyboard profile before official play and disable prohibited automation. A plain-looking configuration file does not prove that every input reaching the game is manual.",
      },
      {
        q: "How should I set my CS2 radar?",
        a: "Choose settings that let you recognize teammate locations and uncovered routes during a short safe glance. Compare local detail with whole-map context at your actual resolution and viewing distance. Use the current client's options rather than assuming another player's numeric values will be readable on your display.",
      },
      {
        q: "Will a smaller HUD improve aim or frame rate?",
        a: "This guide establishes neither claim. HUD adjustments concern readability and screen use. Test whether health, ammo and time can be read comfortably without covering important visual information. Performance problems require their own measurements, while aim depends on a broader set of mechanics than the size of an interface element.",
      },
      {
        q: "How do I undo a bad control change?",
        a: "Restore the saved assignment through the game's controls or your known backup, then test locally. Check whether a startup file or device profile is reapplying the unwanted behavior. Reintroduce only one understood change at a time so you can identify the cause instead of overwriting the problem with another large configuration.",
      },
    ],
    sources: [inputSource, valveNews],
    related: [
      "cs2-practice-commands",
      "cs2-crosshair-codes",
      "best-cs2-settings",
      "cs2-launch-options",
    ],
  }),
  article({
    slug: "cs2-stuttering-fix",
    keyword: "cs2 stuttering",
    secondary: ["cs2 lag", "cs2 ping", "cs2 stuttering fix"],
    title: "CS2 Stuttering Fix: Separate Frame Hitches and Lag",
    description:
      "Diagnose CS2 stuttering with frame-time and network evidence. Isolate local hitches, packet problems and ping before changing settings or hardware.",
    h1: "CS2 stuttering: diagnose the hitch before applying a fix",
    answer:
      "Turn on CS2's telemetry, reproduce the symptom in a local session and an online match, then compare frame-time spikes with network warnings. Rendering hitches, delayed network updates and consistently high ping need different fixes. Change one relevant variable, repeat the same test and keep only improvements that survive a second comparable run.",
    facts: [
      "A high average FPS can coexist with brief visible frame hitches.",
      "Low ping alone does not establish a stable connection.",
      "Steam's telemetry settings expose frame and network evidence in the game.",
      "No setting list can promise a particular FPS gain or eliminate every source of lag.",
    ],
    sections: [
      [
        "Describe what stuttering means on your machine",
        `Begin with a symptom you can reproduce. Does the whole view freeze briefly while turning, do other players jump between positions while your camera remains smooth, or does every online action feel delayed? These descriptions are more useful than saying only “lag.” They point toward different experiments and prevent a rendering problem from turning into an unrelated search for network tweaks.

Make a short baseline note: operating system, graphics driver version, display mode, resolution, map, local or online session, and when the problem began. Add any recent change you actually know about, such as an update, new overlay or a background download. Do not assume the last event caused the problem merely because it happened nearby in time. It is a candidate to test, not a diagnosis.

Set up one repeatable movement route with a turn and a view of the affected area. Use the same route for the next comparisons. A quiet spawn and a busy firefight are not equivalent workloads, so do not compare their FPS as proof that a setting fixed the game. Likewise, a server in a different region changes the network test.

Keep the first note observational: “view pauses at this turn,” “player position jumps while camera stays smooth,” or “delay increases when a download starts.” A clear observation makes a useful support report even if the first fix fails. A vague claim that the game is unplayable on every computer does not help isolate what is happening on yours.`,
      ],
      [
        "Use telemetry to choose the next experiment",
        `Steam documents the telemetry HUD under Settings, Game, Telemetry. It separates local frame performance from network conditions. Frame time helps identify slow presentation intervals; the displayed average FPS describes a different aspect of performance. Ping describes network round-trip delay, while the network indicators help reveal disruptions that an average ping can miss. Enable the relevant displays long enough to observe the symptom instead of relying on memory after the round.

| Observed symptom | First evidence to inspect | First comparison |
| --- | --- | --- |
| Entire view hitches | Frame-time behavior | Same route in local play |
| Remote players jump | Network warnings | Same region at a quiet time |
| Constant online delay | Ping and selected region | Other permitted nearby server |
| Only one scene struggles | Scene and graphics workload | Same view with one setting changed |

Treat the table as triage rather than proof. Local and network problems can coexist. A background task may compete for both processor time and bandwidth. If two indicators worsen together, simplify the environment before choosing a single explanation. Record which symptom changes when you remove the competing task.

Avoid setting warning thresholds so loosely that every hitch goes unmarked or so tightly that ordinary play produces constant warnings. Establish your own baseline first. The useful question is whether a visible incident coincides with an unusual change. Telemetry is evidence to guide a test, not a score to optimize independently of the experience you are trying to improve.`,
      ],
      [
        "Separate local rendering from an online route problem",
        `Run a local session on the same map or an appropriately similar route. If the hitch appears offline at the same turn, focus first on the machine, assets or rendering workload. If local movement is stable while online players repeatedly jump, network investigation becomes more relevant. This comparison narrows the search; it does not prove that every server-side or workload difference has been removed.

Repeat the local route once after it has loaded, without immediately declaring the first pass representative of the whole session. Initial work can differ from later passes. Note whether the hitch happens every time, only on the first encounter, or after a period of play. Those patterns help distinguish a reproducible scene problem from an intermittent background event. Do not delete caches or configuration folders simply because a video recommends doing so after every update.

For online comparison, keep region, mode and approximate conditions as similar as possible. A good result on a distant empty server does not explain a problem on the server where you normally play. If only one server or route is affected, record that boundary. If several players report the same incident at the same moment, include their observations without claiming you have measured the server's internal state.

Use permitted access and network-owner approval throughout. A managed connection may restrict gaming or changes to router settings. Do not bypass those restrictions or install a tunnel to evade them. If you cannot alter the network, a clear report of the symptom and time is still a useful result and gives the owner something concrete to investigate.`,
      ],
      [
        "Local frame hitches: simplify and test one load at a time",
        `Close a competing workload you recognize and can safely pause, such as a separate game, rendering task or large browser session, then repeat the baseline route. Check whether recording, streaming or an overlay coincides with the hitch. Do not disable security protections or remove software indiscriminately. The goal is a controlled comparison, not stripping the computer until the original environment is impossible to reconstruct.

Review display and graphics settings through the game interface. Lower one costly category or resolution as an experiment, then run the same scene. If the result changes, you have evidence about workload sensitivity. If it does not, avoid cycling through every setting at random. A CPU-limited scene, storage interruption or background task may not respond to the first graphics slider you choose.

Use official device-driver channels when updating, record the version and keep the change separate from other experiments. An update is a maintenance step with a testable outcome, not a guarantee of higher FPS. If the problem began immediately after a known driver change, consult the manufacturer's supported recovery process rather than downloading an unknown “gaming driver” package.

Laptop conditions also matter to the comparison. Keep power source, performance profile, airflow and approximate session duration consistent. A short cold start and a long warm session can behave differently. Do not claim thermal throttling without evidence, but record whether the symptom emerges only after sustained play. The [CS2 settings guide](/guides/best-cs2-settings) owns general tuning; this workflow asks whether a specific change actually alters your hitch.`,
      ],
      [
        "Network instability: test the connection you actually use",
        `Pause a background upload or download you control and compare the same online route. On a shared connection, ask before disrupting someone else's work or changing router settings. If possible with permission, compare a wired connection against the existing wireless setup. Keep the test device and server region the same so the result is about the connection change rather than several simultaneous differences.

Record whether the issue appears at particular times or when a known workload starts. A stable quiet period followed by repeated interruptions during an upload is useful evidence for the network owner. It does not identify every router or provider component involved. Avoid declaring a specific service at fault from one match, and avoid buying equipment before a repeatable comparison supports the need.

Steam documents an in-game buffering option for loss and jitter, with additional latency as its tradeoff. Test that option only when the symptom and network evidence make it relevant. More buffering is not a free improvement for a connection that is already stable. Compare smoothness and responsiveness together, and retain the original value so the experiment is reversible.

Do not use a download-speed result as the sole verdict on a game connection. A large transfer and a responsive stream of game updates ask different questions. Likewise, a single speed test during a quiet minute may miss the moment when your problem occurs. A useful report includes the time, chosen region, whether the view remained smooth, and which network indicator changed during the incident.`,
      ],
      [
        "What counts as good ping? Prefer stable and nearby",
        `There is no single ping value that guarantees a good duel. Lower round-trip delay is generally preferable when other conditions are equal, but consistency, timely updates and the actual server route also matter. A low average with frequent disruptions can feel worse than a slightly higher stable connection. Evaluate the match you are playing rather than a number measured to an unrelated test endpoint.

Use the game's available matchmaking-region or acceptable-ping controls as documented, and understand that narrowing acceptable locations may change the available search. Do not promise a particular queue time or server selection. If the nearby location is temporarily problematic, record a comparison with another permitted option instead of treating one result as proof that the entire game or provider is broken.

| Change under consideration | What it might address | What it cannot promise |
| --- | --- | --- |
| Stop a competing upload | Local traffic contention | A shorter physical route |
| Compare wired access | Wireless instability | A fix for every provider issue |
| Select a nearby region | Excessive route distance | Perfect delivery every moment |
| Add relevant buffering | Some visible disruptions | Zero extra delay |

Do not confuse CS2's networking model with immunity to latency. [CS2 subtick](/guides/cs2-subtick) owns that technical explanation. For this diagnosis, the practical task is to decide whether your problem follows a server region, local connection condition or machine workload. A clear boundary is more useful than an arbitrary “good ping” threshold presented as a universal rule.`,
      ],
      [
        "Keep a result log and stop changing what already works",
        `A small log prevents circular troubleshooting. For each attempt, write the symptom, one changed variable, the comparison route and the result. Use plain language such as improved, unchanged or worse, then add the observed evidence. Do not invent precise gains if you did not capture a suitable measurement. A result can be useful without claiming an exact frame-rate increase.

- Reproduce the symptom and record the baseline conditions.
- Enable relevant frame and network telemetry.
- Compare a local route with a comparable online session.
- Change one plausible cause and repeat the same route.
- Restore the original value when the result is unchanged or worse.
- Keep a concise report if the issue requires game, device or network support.

Verify an apparent improvement with another comparable run before changing more variables. Intermittent problems can disappear by chance, and a quiet match can make a weak fix look convincing. If the symptom does not recur, keep the improvement tentative rather than declaring a universal cure. Stop broadening the experiment once the issue is resolved well enough for the intended use.

Be skeptical of large startup-command lists. Some commands may be outdated, ignored or unrelated to the observed bottleneck. The existing [launch-options guide](/guides/cs2-launch-options) owns that review; adding a dozen flags here would obscure the evidence-driven process. Use the [FPS & aim topic](/guides/topics/fps-and-aim) for other focused practice questions. A troubleshooting guide should leave you with fewer unexplained variables, not a configuration you can no longer describe.`,
      ],
      [
        "Do not use a cash match as a performance test",
        `Test a new environment in practice. [PvPStrike](/fps-1v1) is a separate CS-style browser game, so a successful CS2 fix does not establish its browser performance. Use [browser FPS games](/guides/browser-fps-games) for access checks, [CS2 1v1 for money](/guides/cs2-1v1-for-money) for the game distinction and [crypto FPS games](/guides/crypto-fps-game) for payment terminology.

Hypothetical USD example A: two $1 entries produce $2; a 5% combined-pot FPS fee takes $0.10, leaving $1.90 winner credit and +$0.90 net. Hypothetical USD example B: two $5 entries produce $10; $0.50 is deducted, leaving $9.50 credit and +$4.50 net. Losing costs the entry. These are fee examples, not earnings or a reason to test an unstable machine with money.

PvPStrike's local bot practice is first to seven; cash series are best of thirteen. The published minimum is $1, with actual entries shown in the lobby. Cash is 18+ where permitted; no universal US state legality is asserted. Consult the [FPS money hub](/guides/fps-for-money-hub) and [fairness](/fairness). Inputs, hits and results are server-validated, but that is not a guarantee against cheating or connection problems.`,
      ],
    ],
    faqs: [
      {
        q: "Why does CS2 stutter even with high average FPS?",
        a: "Averages can hide brief slow frames. Use the frame-time evidence during the actual visible hitch and compare the same scene in local play. This guide does not identify a universal cause from average FPS alone. Background work, scene load and other conditions need separate, reproducible comparisons before a fix can be credited.",
      },
      {
        q: "How do I tell CS2 lag from a rendering hitch?",
        a: "Describe whether the entire view pauses or remote movement jumps while your own camera stays smooth. Compare local and online sessions with telemetry visible. That gives a starting point rather than a final diagnosis: several causes can coexist, and the next step should isolate one plausible variable under comparable conditions.",
      },
      {
        q: "What is a good ping for CS2?",
        a: "Prefer a stable connection to a suitable nearby server, without treating one numeric threshold as a guarantee. Compare the actual match conditions and the frequency of visible disruptions. A single average ping or a test to a different service does not establish how reliably your game updates arrive.",
      },
      {
        q: "Should I always increase network buffering?",
        a: "No. It is a tradeoff to test when relevant network problems are present, not a universal optimization. Keep the original setting, compare the same route and judge responsiveness alongside smoothness. If the experiment does not improve the observed problem, restore the original value rather than accumulating unexplained changes.",
      },
      {
        q: "Will new launch options remove every stutter?",
        a: "No such result is established. Startup flags are only relevant when their documented behavior addresses your actual problem. Diagnose first, then test an understood change. A long copied command list makes it harder to identify which variable mattered and can conceal that the symptom was a connection issue rather than rendering.",
      },
      {
        q: "When should I contact support instead of changing more settings?",
        a: "When the symptom is reproducible but reasonable controlled comparisons do not isolate it, or when the necessary change belongs to a network owner or device maintainer. Send the map, time, region, versions, observed indicators and changes already tried. A concise reproducible report is more useful than another untracked configuration pack.",
      },
    ],
    sources: [
      telemetrySource,
      {
        label: "Valve: network buffering introduced in February 2024",
        url: "https://store.steampowered.com/news/posts/?appids=730&enddate=1707445453&feed=steam_community_announcements",
      },
      valveNews,
    ],
    related: ["best-cs2-settings", "cs2-launch-options", "cs2-subtick", "cs2-anti-cheat"],
  }),
  article({
    slug: "cs2-on-mac",
    keyword: "cs2 on mac",
    secondary: ["cs2 on steam deck", "cs2 system requirements", "can my pc run cs2"],
    title: "CS2 on Mac and Steam Deck: Requirements and Options",
    description:
      "Check CS2's supported platforms, minimum requirements and Steam Deck considerations. Compare native access, remote play and separate browser shooters.",
    h1: "CS2 on Mac: separate supported access from workarounds",
    answer:
      "The reviewed Steam listing provides Windows and SteamOS/Linux requirements, with no native macOS requirements. Treat a Mac as unsupported for native CS2 rather than assuming the old CS:GO client still applies. Steam Deck is a different Linux-based device: check its live compatibility details, controls and practical performance before deciding it meets your needs.",
    facts: [
      "A Steam account and a Steam client on macOS do not establish native CS2 support.",
      "Meeting minimum requirements is not a promise of a particular frame rate or competitive experience.",
      "Remote play runs the game on another host and adds a separate connection path.",
      "A browser shooter is a different game, not a way to load native CS2 maps without the client.",
    ],
    sections: [
      [
        "Start with the platform, not the age of the computer",
        `A powerful computer can still lack an officially supported version of a game. First identify the operating system and the game build you intend to use. Valve's reviewed CS2 store listing has Windows and SteamOS/Linux requirement sections. It does not present macOS as a native CS2 platform. That is the basis for this guide's access decision, rather than a claim that a particular Mac chip is too slow.

Do not infer current support from an old CS:GO memory, a historical store review or the existence of Steam for Mac. A store page can contain content from the game's earlier history, while the current game has different requirements. Confirm that a tutorial concerns native CS2, not a legacy client, an unofficial translation layer or a stream from another machine.

Write down the exact model, operating system version, processor architecture, memory and available storage before following instructions. “MacBook,” “gaming laptop” and “Steam Deck” hide important differences. A guide written for a different architecture or operating system may be irrelevant even if the device looks similar. Keep this inventory private unless a support question actually needs it; there is no reason to post serial numbers or account credentials.

This article does not recommend an unsupported installation workaround as a reliable competitive setup. Compatibility can depend on software versions, anti-cheat behavior and the particular service. If a method is not supported in the reviewed official documentation, describe it that way. Do not turn one person's successful launch into a general guarantee that updates, matchmaking or input behavior will remain reliable.`,
      ],
      [
        "Read the minimum requirements as compatibility gates",
        `The reviewed Valve listing gives Windows minimums including Windows 10, four hardware CPU threads, 8 GB of RAM, a graphics device meeting its DirectX 11 and Shader Model 5.0 conditions, and 85 GB of available storage. Its Linux section lists Ubuntu 20.04 and Vulkan-related graphics requirements, alongside memory and storage conditions. Check the live store page before downloading because requirements and installed size can change.

These are compatibility gates, not a benchmark table. A processor meeting a named minimum does not establish that every map, resolution or background workload will perform the same way. Graphics memory is also not a substitute for the required graphics feature support. Two devices with similar memory amounts can have different architectures, drivers and practical capabilities.

| Requirement question | What to verify | What it cannot establish alone |
| --- | --- | --- |
| Operating system | Supported platform and version | Smooth performance on all hardware |
| Processor | Thread and architecture conditions | A specific frame rate |
| Graphics | Required API features and drivers | Equal performance at every resolution |
| Storage | Current free space plus update room | Absence of load-time interruptions |

If you are uncertain, gather the system information from the operating system's own interface and compare it with the current listing line by line. Do not download a “can my PC run CS2” executable from an unfamiliar site merely to read hardware specifications. A manual inventory is enough to find an obvious platform or feature mismatch before any performance test.`,
      ],
      [
        "Can my PC run CS2? Use a two-stage decision",
        `Separate “can launch under supported conditions” from “works well for my intended session.” In the first stage, compare the operating system, processor, memory, graphics features, drivers and storage with Valve's listing. An unresolved mismatch should be settled before spending time on graphics sliders. Lowering resolution cannot add a missing supported operating system or graphics feature.

In the second stage, test the actual workload without paying an entry or assuming that a quiet menu represents play. Use a local session, walk a repeatable route, turn through several views and inspect frame behavior. Then compare an online session under the same reasonable conditions. The result is personal evidence about that device and setup, not a published benchmark for every computer with the same product name.

Keep display mode, power source and background tasks consistent. A laptop on battery with a different performance profile is a different test from the same laptop plugged in. If the experience deteriorates only after a longer session, record that timing rather than declaring the initial minute representative. Use the game's visible telemetry to distinguish local hitches from network issues.

Define an acceptable result in practical terms: can you read the scene, move predictably and play without repeated interruptions? This guide supplies no measured FPS or universal threshold. If you need evidence for a hardware purchase, seek current independent measurements for the exact hardware separately; do not turn these minimum requirements into a shopping recommendation. The [CS2 settings guide](/guides/best-cs2-settings) owns general tuning once basic support is established.`,
      ],
      [
        "Steam Deck: compatibility, controls and display are separate",
        `Steam Deck is not a Mac and should not be assessed through macOS instructions. Valve's Deck support documentation directs users to the live game's compatibility details when requirements are not fully met. Check those details for CS2 instead of assuming that the existence of a Linux build equals a particular certification or a flawless handheld experience. This guide makes no current Verified, Playable or Unsupported badge claim.

Consider three tasks separately. First, does the supported game environment launch and update? Second, are the interface and controls usable in the way you plan to play? Third, is the actual session stable enough for your purpose? A successful launch answers only the first task. A mouse-and-keyboard setup and handheld controls also create different input problems even on the same underlying device.

If using external peripherals, verify them before joining a match. Check display recognition, mouse capture, keyboard bindings, audio input and a comfortable physical arrangement. Do not buy accessories on the assumption that this article has tested a particular dock or display; it has not. Use the device and accessory manufacturers' current documentation for compatibility and power requirements.

A short local practice session is the right place to test the complete arrangement. Include moving, turning, selecting equipment and using communication, then repeat after reconnecting the peripherals if that is part of your normal use. Keep resolution and output mode in the note. The practical question is whether your complete setup works consistently, rather than whether someone else's handheld clip looks smooth at a different scale.`,
      ],
      [
        "Native play, remote play and a separate browser game",
        `Remote play changes where the game runs. A supported host performs the native game workload, while another device receives the stream and sends input. That can make access possible from a device without a native client, but it adds a host requirement and a streaming connection. It is not evidence that CS2 has acquired a native macOS build. Consult the current service and host documentation before relying on any particular arrangement.

Distinguish a host you control from a commercial cloud service. Service catalogs, account rules, locations and anti-cheat compatibility can change. This article verifies no current cloud CS2 listing, subscription price or competitive suitability. Do not pay for a plan on the basis of an old tutorial or assume a service permits every game simply because it streams other Steam titles.

| Access route | Where the game runs | Main question to resolve |
| --- | --- | --- |
| Supported native CS2 | Your supported local machine | Requirements and actual performance |
| Remote session | A separate supported host | Host access, streaming path and controls |
| Steam Deck setup | The Deck's configured environment | Live compatibility and complete input setup |
| Browser shooter | The browser game's own runtime | Whether that separate game suits the goal |

A separate browser shooter can be convenient for a short aim session, but it will not load your native CS2 map, inventory or configuration by implication. Judge it as another game. This distinction is especially important when a page offers cash entries: product similarity does not establish shared rules, Valve affiliation or a common competitive ladder.`,
      ],
      [
        "A cautious browser comparison from official pages",
        `The table keeps verified access separate from unverified financial terms. Krunker's official page offers browser play, and Venge explicitly describes play without a download. BlayzeGames' own information links mobile Bullet Force versions; a current desktop-browser download arrangement was not established in the reviewed official material. Bullet Force's published rules prohibit hacking, which is a policy statement rather than proof of a technical detection method.

| Game | Download | Real-money play | Anti-cheat | Payout | Minimum stake |
| --- | --- | --- | --- | --- | --- |
| Krunker | Browser access on official page | not verified in reviewed official sources | not verified in reviewed official sources | not verified in reviewed official sources | not verified in reviewed official sources |
| Venge | No download for advertised browser play | not verified in reviewed official sources | not verified in reviewed official sources | not verified in reviewed official sources | not verified in reviewed official sources |
| Bullet Force | Mobile downloads linked; desktop-browser terms not verified in reviewed official sources | not verified in reviewed official sources | Rules prohibit hacking; technical method not verified in reviewed official sources | not verified in reviewed official sources | not verified in reviewed official sources |
| PvPStrike | Browser game | Optional eligible cash series | Server validates inputs, hits and results; no immunity promise | Winner wallet credit after 5% combined-pot FPS fee | Published $1; check live lobby |

Unverified does not mean absent. It means this review does not support the claim, so the guide should not imply cash play, withdrawal availability or an entry minimum for those competitors. In-game currency is not automatically withdrawable money. A familiar game title is also not enough to trust an unrelated mirror or downloadable client.

Use [browser FPS games](/guides/browser-fps-games) for the broader access comparison. For this page's hardware decision, the important point is simpler: a browser game has its own compatibility and controls, so test it locally on the intended device. Do not infer that any particular Mac or Deck arrangement is supported solely because the game does not require the native CS2 download.`,
      ],
      [
        "A device-readiness checklist before a serious session",
        `Prepare the complete route from device to game before judging the result. That means account access, supported client or browser, input, display, audio and connection. A setup that succeeds only when a particular accessory is already attached may still be usable, but that condition belongs in your note. The purpose is to discover dependencies in practice rather than while another player waits for a match to begin.

- Identify the device model, operating system and processor architecture.
- Compare the current official game requirements with actual system information.
- Leave sufficient free storage for the live installation and its updates.
- Test display, mouse, keyboard, sound and voice in local practice.
- Compare local smoothness with an online session on permitted access.
- Record the working conditions and revisit them after a significant update.

If access fails, note the stage: installation, launch, login, map load, input or online connection. “CS2 does not work” combines too many tasks. A precise stage helps the relevant support channel answer without asking you to repeat every unrelated experiment. Use official account and device tools; never share a login code or install a stranger's support utility to prove ownership.

Respect managed-network and device rules. Get the owner's approval before installing software or changing network settings, and do not follow unblock or bypass instructions. Browse the [FPS & aim topic](/guides/topics/fps-and-aim) for practice once the environment is usable. [CS2 launch options](/guides/cs2-launch-options) discusses startup settings, and [CS2 practice commands](/guides/cs2-practice-commands) handles local tools; neither can turn an unsupported native platform into an official one.`,
      ],
      [
        "If the separate browser choice includes an entry",
        `[PvPStrike](/fps-1v1) is our independent CS-style browser shooter, not Valve CS2. It offers local bot practice first to seven and cash series best of thirteen. The [CS2 1v1 comparison](/guides/cs2-1v1-for-money) explains the product boundary, while [crypto FPS games](/guides/crypto-fps-game) distinguishes payment rails from token rewards.

Hypothetical USD example A: $1 each creates a $2 pot; the 5% combined-pot FPS fee takes $0.10, winner credit is $1.90 and net change +$0.90. Hypothetical USD example B: $5 each creates $10; fee $0.50, winner credit $9.50 and net change +$4.50. Losing costs the entry. These are arithmetic examples, not earnings or verified results.

The published minimum stake is $1; check the lobby for actual available entries. Cash requires age 18+ and permitted access, without asserting blanket US state legality. Test controls and stability in practice before any entry. Read the [FPS money hub](/guides/fps-for-money-hub) and [fairness page](/fairness): server validation of inputs, hits and results is not cheating immunity, and device access alone says nothing about a player's chance of winning.`,
      ],
    ],
    faqs: [
      {
        q: "Can I play native CS2 on a Mac?",
        a: "The reviewed Valve listing provides Windows and SteamOS/Linux requirements, not a native macOS version. Treat native Mac access as unsupported rather than following old CS:GO instructions. An unofficial workaround or a stream from a separate host would be a different arrangement, and this guide does not certify its reliability or matchmaking compatibility.",
      },
      {
        q: "Does an Apple silicon Mac change that support answer?",
        a: "Processor power and platform support are separate questions. The absence of a native macOS listing is not resolved simply by choosing a faster Mac. Identify the exact software method a tutorial uses and whether its current official documentation supports it. Do not treat a successful launch shown elsewhere as a universal guarantee.",
      },
      {
        q: "Can CS2 run on Steam Deck?",
        a: "Assess the Deck separately from a Mac: check the live game compatibility details, the configured environment and your controls. This guide claims no current compatibility badge or measured performance. Test the complete handheld or peripheral setup in practice rather than assuming Linux availability guarantees the experience you want.",
      },
      {
        q: "How do I know whether my PC meets CS2 requirements?",
        a: "Read the operating system's system information and compare platform, processor, memory, graphics features, drivers and storage with Valve's live listing. Then test the actual workload. Minimum compatibility is only the first stage; it does not promise a frame rate, a smooth online connection or equal results at every resolution.",
      },
      {
        q: "Is remote play the same as a native Mac version?",
        a: "No. The game runs on a separate host and the Mac receives a stream while sending input. That introduces host and connection requirements. Check the current service documentation and game availability before paying for anything; this guide does not verify a commercial cloud catalog, subscription price or competitive suitability.",
      },
      {
        q: "Can a browser FPS replace the CS2 download?",
        a: "It can provide access to that separate browser game, not native CS2 content. Maps, inventories, settings and ranks do not transfer by similarity. Test the browser game's own controls and stability on your device. If it offers optional money matches, eligibility and entry terms are another decision entirely.",
      },
    ],
    sources: [
      storeSource,
      {
        label: "Valve: Steam Deck software and compatibility guidance",
        url: "https://help.steampowered.com/en/faqs/view/7DD4-C618-182E-0E49",
      },
      { label: "Krunker: official browser page", url: "https://krunker.io/" },
      { label: "Venge: official no-download description", url: "https://venge.io/" },
      {
        label: "BlayzeGames: official mobile product links",
        url: "https://blayzegames.com/about-2/",
      },
      {
        label: "BlayzeGames: Bullet Force rules",
        url: "https://blayzegames.com/bullet-force-rules/",
      },
    ],
    related: ["best-cs2-settings", "cs2-launch-options", "cs2-practice-commands", "is-cs2-free"],
  }),
  article({
    slug: "cs2-workshop-maps",
    keyword: "cs2 workshop maps",
    secondary: ["cs2 community servers", "load workshop maps cs2", "cs2 workshop 1v1 maps"],
    title: "CS2 Workshop Maps: Install, Launch and Join Servers",
    description:
      "Subscribe to CS2 Workshop maps, verify downloads and launch local practice. Separate map installation from community-server access and fair 1v1 setup.",
    h1: "CS2 Workshop maps: installation and server workflows",
    answer:
      "Find a compatible CS2 map in Steam Workshop, verify its creator and instructions, subscribe, let Steam finish the download and open it through the game's Workshop map selection. A subscription installs content; it does not automatically create a multiplayer server. For online play, choose a compatible community server or a hosting workflow supported by the current client.",
    facts: [
      "Valve's Maps Workshop announcement explicitly separates offline subscriptions from community-server hosting.",
      "A Workshop item, a collection and a live server are different objects.",
      "A map can require settings or server plugins that a subscription alone does not supply.",
      "For a 1v1, agree on spawns, equipment, boundaries and resets before interpreting the score.",
    ],
    sections: [
      [
        "Map, collection, mode and server: identify the object",
        `A Workshop map is content distributed through Steam. A collection groups items and may include several maps or related dependencies. A community server is a running multiplayer environment with an operator, configuration and rules. These objects can be connected without being interchangeable. Subscribing to a collection does not mean you have joined a server, and joining a server does not mean its movement rules are built into the map file.

Valve's November 2023 announcement opened the CS2 Maps Workshop for uploads, offline subscriptions and community hosting. That establishes the basic workflow. It does not establish that every item is compatible forever or that every historical Counter-Strike mode has an official current equivalent. Read the specific item and server instructions before expecting a custom activity to behave like a video.

| Object | What it supplies | What it does not supply by itself |
| --- | --- | --- |
| Workshop map | Geometry and included map content | A guaranteed public match |
| Collection | A grouped set of subscriptions | Proof every item is needed |
| Local session | A place to load and practise | Automatic remote reachability |
| Community server | A running configured environment | Endorsement of every linked service |

Before clicking subscribe, state the goal: local route practice, a private 1v1, a movement course or a public community session. That goal determines which object you need. A route walk usually needs only a compatible map and local session. A plugin-dependent timer mode may require the operator's configured server. Choosing the correct workflow first prevents unnecessary downloads and confusing troubleshooting later.`,
      ],
      [
        "Find a compatible item and verify its identity",
        `Open the Workshop from the game's Steam entry or another verified Valve route. Check that the item is for CS2, then read its title, creator, description, dependency notices and change notes. Similar names can refer to a port, a remake or an unrelated upload. Preserve the item's identity when sharing it with friends so everyone uses the same content rather than choosing the first search result with a familiar name.

Look for instructions that match your goal. Does the creator describe offline use, a custom mode, required server behavior or known limitations? Is the item a map or a collection? Does it rely on another item? A large subscription count or many positive reactions can be useful context, but neither proves present compatibility. Recent creator information matters when an update changes behavior.

Be cautious about instructions that send you to an unrelated executable, account-login page or configuration download. A normal Workshop subscription should remain within the established Steam workflow. Server-side plugins belong to the operator's environment; do not install an unknown tool because a chat message claims it is necessary for a casual map. Keep account credentials and authentication codes private.

This guide deliberately avoids an aim-map ranking. The existing [CS2 aim maps](/guides/cs2-aim-maps) page owns recommendations for that training intent. Here the task is to obtain the intended item, understand its requirements and use the appropriate launch or server path. The same verification habit works for a route-practice map, an experimental custom map or a small duel arena without claiming that the publisher has tested every upload.`,
      ],
      [
        "Subscribe, wait for the download, then launch locally",
        `Once the item is verified, subscribe through its Steam page. Allow the Steam client to finish the relevant download or update before launching the map. A subscribed state on the page is not the same as a completed local installation. If the map does not appear immediately, inspect the client's download state before subscribing to several copies or deleting folders.

Open CS2's Play area and the Workshop map selection exposed by the current client. Choose the intended item and follow its mode or launch instructions. Menu wording can change, so use the current Workshop selection rather than expecting an old screenshot's exact button position. Valve's announcement supports this general offline route; it is not a guarantee that every custom mode uses identical options.

Load once without a competitive objective. Walk, turn, interact and check that the expected content appears. Read any in-map instructions. If a map opens but the intended timer, rules or respawns are missing, revisit the description: those features may belong to a server plugin or a configuration rather than the subscribed geometry. Do not assume the download is corrupt simply because the local environment differs from a public server.

Keep the first test small. One map loaded successfully gives you a baseline for troubleshooting another item. Installing a large collection before checking any member makes it harder to identify the broken dependency or incompatible version. Note the map identity, launch path and any explicit requirement you used, then preserve that working combination before adding more custom content.`,
      ],
      [
        "Private play with friends needs a hosting decision",
        `Decide who will run the session and how friends will reach it. A local map launch and a multiplayer host are different tasks. Older official Workshop material describes friend-lobby behavior, but do not assume every historical instruction or automatic-download promise applies unchanged to your current client and network. Check the present game interface and map instructions before promising a one-click private match.

First confirm that the host can load the item locally and that everyone has the correct map identity and compatible client version. Then use a supported friend or server workflow and test connection before planning a longer session. If the connection fails, separate map content from reachability: can the guest see the session, connect to it, and load the map? Each stage has different possible causes.

Do not open router ports, change firewall policy or alter a managed network without the owner's approval. Use current platform and operating-system guidance for a legitimate host configuration. A private practice goal does not authorize bypassing a workplace, school or household restriction. If local hosting is unsuitable, a permitted community or dedicated-server route may be more practical, but its operator and rules need their own review.

Keep the session's scope modest until the workflow is reliable. Load one known map, invite one guest and verify the basic controls and reset behavior. Only then add more players or mode complexity. The useful outcome is a repeatable way to start practice, not a claim that every Workshop map automatically supports every party size or connection arrangement.`,
      ],
      [
        "Join a community server through its published route",
        `For a community session, identify the operator, expected map and rules before connecting. Use the current in-game or Steam community-server tools, or the operator's legitimate published connection instructions. If a console connection command is provided, confirm that the address belongs to the intended operator rather than copying it from an unrelated comment. This guide does not publish a live server directory or claim that a particular endpoint remains available.

Read the mode description. A server can use familiar geometry while changing respawns, equipment, movement, scoring or permitted assistance. That is why “the map feels different” does not automatically mean the installation failed. Ask whether the server's configuration is part of the intended activity. A surf course, retake mode and conventional bomb round can require different behavior even if each uses Workshop content.

Treat external services separately. A server listing does not establish that a linked skin service, paid membership or cash competition is legitimate, legally available or affiliated with Valve. Do not provide a Steam login to a page merely because its name resembles the operator's. Follow established account-security practices and use the game's reporting and support channels where applicable.

If the server is full, unreachable or running another map, record that actual state and try a permitted alternative later. Do not describe a failed connection as proof that community servers no longer work generally. Likewise, a successful session confirms only that particular route under those conditions. Maintain a small list of verified operator instructions rather than a large unreviewed list of addresses that can become stale.`,
      ],
      [
        "Configure a useful Workshop 1v1 instead of ranking maps",
        `The best installation for your duel is one that supports a clear exercise. Decide whether the task is first-shot placement, controlled peeking, repeated spawns or a small objective round. Then inspect the map's geometry and reset behavior to see whether it fits. This guide does not duplicate an aim-map recommendation list; it explains how to turn an installed arena into a fair and interpretable session.

Set weapons, armor, legal positions, utility and side changes before the first scored attempt. A map with automatic equipment may need different handling from one relying on the host's settings. Follow its instructions and verify the result with both players. Do not assume that identical-looking rifles imply identical health, movement or reset conditions across different custom modes.

| Duel setup choice | Why it matters | Useful agreement |
| --- | --- | --- |
| Spawn positions | Determines initial information | Equal blocks from both sides |
| Equipment | Changes damage and recovery | Same stated weapon and armor |
| Legal area | Limits searching and flanks | Clear boundary for the drill |
| Reset rule | Affects repeated attempts | Known restart after each result |

For first-shot practice, begin with one known defender position and a constrained entry. Add uncertainty only after the movement is deliberate. For a wider duel, acknowledge that searching and prediction are part of the score. Record the failure type as well as wins. A player who won because the opponent misunderstood the legal boundary has not supplied evidence of superior aim. Resolve the rule and repeat before interpreting the result.`,
      ],
      [
        "Troubleshoot by stage and keep a clean subscription list",
        `When something fails, identify the stage: item discovery, download, local launch, custom behavior, hosting or remote connection. A missing map in the menu is not the same problem as a loaded map with no timer. A guest who cannot reach the host needs a different investigation from a guest who reaches the session but lacks content. This distinction prevents destructive cleanup from becoming the first response to every symptom.

- Verify the item identity, game version and explicit dependencies.
- Confirm that Steam finished the download or update.
- Test a local launch before diagnosing multiplayer hosting.
- Read the map instructions for mode settings and server requirements.
- Check operator and network-owner permission before connection changes.
- Keep the working map and remove unused subscriptions deliberately.

If one item fails while another works locally, preserve that comparison and consult the creator's latest notes. If every item fails, inspect the client and download state through Steam's supported tools. Avoid manually deleting shared files or copying a stranger's entire configuration as a first step. A small controlled change is easier to undo and easier to describe in a support request.

Clean up after a session by identifying content you no longer need, not by removing broad folders indiscriminately. Keep the exact item used for a recurring drill so the next session can start from the same conditions. Use [CS2 practice commands](/guides/cs2-practice-commands) for local-session controls and [CS2 game modes](/guides/cs2-game-modes) for the difference between activity types. The [FPS & aim topic](/guides/topics/fps-and-aim) links those distinct tasks without turning every Workshop search into an aim-map ranking.`,
      ],
      [
        "Workshop hosting is separate from a browser entry",
        `[PvPStrike](/fps-1v1) is an independent CS-style browser game. It cannot import Workshop maps or join a native CS2 community server. Compare [browser FPS games](/guides/browser-fps-games), [CS2 1v1 for money](/guides/cs2-1v1-for-money) and [crypto FPS games](/guides/crypto-fps-game) before treating similar-looking arenas as the same product.

Hypothetical USD example A: $1 from each player creates $2; PvPStrike's 5% combined-pot FPS fee is $0.10, winner credit $1.90 and net change +$0.90. Hypothetical USD example B: $5 each creates $10; fee $0.50, credit $9.50 and net change +$4.50. A loser loses the entry. These calculations describe no earnings or actual settled match.

PvPStrike practice is first to seven against a local bot; cash matches are best of thirteen. The published minimum is $1, but the lobby determines available entries. Cash requires age 18+ where permitted; no blanket US state legality is claimed. Consult the [FPS money hub](/guides/fps-for-money-hub) and [fairness](/fairness). Server validation of inputs, hits and results does not guarantee immunity from cheating, and a custom-server score proves no cash-game advantage.`,
      ],
    ],
    faqs: [
      {
        q: "How do I load a CS2 Workshop map?",
        a: "Verify a compatible map, subscribe through Steam, wait for the download to finish and choose it through the current game's Workshop map selection. Follow the item's launch instructions. Test locally first so a missing multiplayer connection is not confused with a content problem. Exact menu placement can change with the client.",
      },
      {
        q: "Why is my subscribed map missing or not working?",
        a: "Check whether the download finished, whether the item targets CS2 and whether its creator lists dependencies or compatibility issues. Distinguish a missing item from a loaded map whose custom behavior requires server settings. Compare one known working item before deleting files or replacing your entire configuration.",
      },
      {
        q: "Does subscribing automatically let friends join me?",
        a: "No. Subscription supplies content; multiplayer still needs a supported hosting or server workflow. Verify the host can load the map, confirm the shared item identity and test one guest connection. Do not assume an older lobby tutorial proves present network behavior, and get owner approval before changing router or firewall settings.",
      },
      {
        q: "How do I find CS2 community servers?",
        a: "Use current game or Steam server tools and a legitimate operator's published connection instructions. Check the operator, mode, rules and expected map before joining. This guide provides no live endpoint list. A server's existence does not verify the safety, cash terms or legal availability of an external service it links.",
      },
      {
        q: "What makes a Workshop map suitable for a 1v1?",
        a: "It should fit the intended drill, provide understandable spawns and allow consistent equipment and resets. Agree on the legal area and swap sides before comparing scores. This page focuses on setup rather than ranking maps; an arena suitable for repeated first shots may be unsuitable for a wider objective exercise.",
      },
      {
        q: "Are Workshop maps the same as official matchmaking maps?",
        a: "No. Workshop is a distribution route for custom content, while an official queue has its own published selection and rules. Community servers can also configure content differently. A map's presence in your subscription list does not establish current Premier availability, Valve endorsement of its operator or compatibility with a separate browser game.",
      },
    ],
    sources: [
      workshopSource,
      {
        label: "Valve: Workshop overview",
        url: "https://www.counter-strike.net/workshop/workshop",
      },
      valveNews,
    ],
    related: ["cs2-aim-maps", "cs2-practice-commands", "cs2-game-modes", "cs2-map-pool"],
  }),
];
