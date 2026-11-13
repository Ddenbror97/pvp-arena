/**
 * Shared prediction contract. Old clients must reload before using the updated flight, combat
 * and driving rules (7: vehicle handling, rows with steering and slide; 8: the MP5 and Desert
 * Eagle with the pistol slot and new item codes, bullet drag and per-gun recoil; 9: the Extended Magazine, a new item code and an eleventh
 * loot-row field; 10: lag compensation by measured ping, the playback timeline on the server's
 * clock, and hits sent at once in `br-fast` messages, which an older client would not read; 11:
 * the Hunting Rifle, a new weapon and item code; 12: the fixes-v1 world: helidecks with collision
 * of their own, every hospital window a breakable pane (the pane ids move), lifts called from
 * the landing; 13: the 16-perk tablet without Tactical Data, its state on the tablet item, and
 * footprints).
 */
export const BR_RULESET_VERSION = 13;
