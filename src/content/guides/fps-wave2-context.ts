import type { GuideSection } from "./types";

/** Contextual links from established intent owners into the more specific guides. */
export const FPS_WAVE2_CONTEXT: Record<string, GuideSection> = {
  "browser-fps-games": {
    id: "specific-browser-games",
    title: "Choose a specific game or access task",
    body: `Use the game-specific pages for controls, access and client differences: [Deadshot.io](/guides/deadshot-io), [Krunker](/guides/krunker-unblocked), [Bullet Force](/guides/bullet-force), [Venge.io](/guides/venge-io) and [War Brokers](/guides/war-brokers). Their names do not imply identical modes, weapons or payment support.

If your question is access rather than mechanics, [Counter-Strike unblocked](/guides/counter-strike-unblocked) separates an official installed game from a browser substitute; [shooting games unblocked](/guides/shooting-games-unblocked) explains permitted access and provenance. For puzzles, strategy and other genres alongside shooters, use [best browser games](/guides/best-browser-games).`,
  },
  "cs2-vs-valorant": {
    id: "broader-alternatives",
    title: "If neither game fits the session",
    body: `The two-title comparison above does not rank every shooter. [Games like CS:GO](/guides/games-like-csgo) focuses on Counter-Strike-style alternatives; [games like Valorant](/guides/games-like-valorant) considers ability and team-role differences. [Tactical shooter games](/guides/tactical-shooter-games) explains the wider design category.

For different constraints, compare [FPS games across formats](/guides/best-fps-games), [mobile FPS choices](/guides/best-mobile-fps) or [CS 1.6 online](/guides/cs-1-6-online). A legacy client, mobile touchscreen and modern desktop shooter have different controls and compatibility requirements.`,
  },
  "crypto-fps-game": {
    id: "named-games-and-payouts",
    title: "Separate named games, asset ownership and payouts",
    body: `For specific projects, read [Off The Grid](/guides/off-the-grid-game) and [Shrapnel](/guides/shrapnel-game) rather than assuming that a crypto label describes their current release or economy. [NFT shooter games](/guides/nft-shooter-games) examines ownership and ongoing game utility; [best crypto games](/guides/best-crypto-games) is a choice framework.

[Earning crypto through games](/guides/earn-crypto-playing-games) follows the payout and record trail. [Real-money shooter rules](/guides/skill-games-real-money) narrows the eligibility question to FPS entries. Neither a token balance nor the word skill establishes withdrawable profit or local permission.`,
  },
  "edpi-calculator": {
    id: "sensor-before-calculation",
    title: "Check the sensor value before multiplying",
    body: `If the hardware setting is uncertain, start with [mouse DPI](/guides/mouse-dpi). The operating system's cursor-speed slider and a mouse's configured sensor value are different controls. [Polling rate](/guides/polling-rate) concerns report timing, so it does not replace the DPI input in this calculator.`,
  },
  "best-cs2-settings": {
    id: "diagnose-the-symptom",
    title: "Choose the troubleshooting branch",
    body: `Use [input lag](/guides/input-lag) for the delay from an action to its visible response, and [CS2 stuttering](/guides/cs2-stuttering-fix) for uneven frame delivery. [240Hz versus 144Hz](/guides/240hz-vs-144hz) separates display refresh from rendered frame rate. These are related measurements, not interchangeable fixes.

If you are checking whether a platform can run the game at all, read [CS2 on Mac and Steam Deck](/guides/cs2-on-mac) before copying a Windows configuration.`,
  },
  "cs2-aim-training": {
    id: "measure-the-drill",
    title: "Measure a drill without turning it into a ranking",
    body: `A [mouse accuracy test](/guides/mouse-accuracy-test) can track a repeatable local drill, but its score does not predict a duel winner. [Valorant aim training](/guides/valorant-aim-trainer) addresses transfer to an ability shooter. Before adding an external sight to either game, review the permission and visibility questions in [crosshair overlays](/guides/crosshair-overlay).`,
  },
  "cs2-economy": {
    id: "weapon-decisions",
    title: "Choose the purchase for its role",
    body: `The [CS2 weapon tier guide](/guides/cs2-weapon-tier-list) organizes roles and budgets; [CS2 pistols](/guides/cs2-pistols) covers pistol and eco-round decisions. Compare [USP-S versus P2000](/guides/usp-vs-p2000) and [M4A4 versus M4A1-S](/guides/m4a4-vs-m4a1-s) for narrower CT choices.

An expensive weapon is not a complete round plan. The [AWP guide](/guides/cs2-awp-guide) connects the purchase to positioning, while [CS2 grenades](/guides/cs2-grenades) explains how utility spending supports the next fight.`,
  },
  "cs2-map-pool": {
    id: "map-specific-vocabulary",
    title: "Learn location names separately from pool membership",
    body: `Use [Nuke callouts](/guides/nuke-callouts), [Overpass callouts](/guides/overpass-callouts) and [Inferno callouts](/guides/inferno-callouts) to learn connected routes. The [Anubis and Ancient callout guide](/guides/anubis-ancient-callouts) keeps those maps' vocabularies separate and includes a labeled Vertigo reference. A published callout page does not establish that a map is currently in an event's pool.`,
  },
  "cs2-practice-commands": {
    id: "bindings-and-community-content",
    title: "Keep controls and community content separate",
    body: `For key assignments and current command-policy cautions, use [CS2 binds](/guides/cs2-binds). For installation, loading and server provenance, use [CS2 Workshop maps](/guides/cs2-workshop-maps). [Surf, bhop and KZ](/guides/cs2-surf) concerns community movement practice, whose server rules need not match competitive movement.`,
  },
};
