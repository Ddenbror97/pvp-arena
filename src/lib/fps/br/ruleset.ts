/**
 * Shared prediction contract. Old clients must reload before using the updated flight, combat
 * and driving rules (7: vehicle handling, rows with steering and slide; 8: the MP5 and Desert
 * Eagle with the pistol slot and new item codes, bullet drag and per-gun recoil; 9: the Extended Magazine, a new item code and an eleventh
 * loot-row field; 10: lag compensation by measured ping, the playback timeline on the server's
 * clock, and hits sent at once in `br-fast` messages, which an older client would not read;
 * 11: the 16-perk tablet without Tactical Data, footprints, and the SPAS-12 with its shells and
 * two new item codes).
 */
export const BR_RULESET_VERSION = 11;
