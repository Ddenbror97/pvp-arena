/**
 * Shared prediction contract. Old clients must reload before using the updated flight, combat
 * and driving rules (7: vehicle handling, rows with steering and slide; 8: the MP5 and Desert
 * Eagle with the pistol slot and new item codes, bullet drag and per-gun recoil; 9: the Extended Magazine, a new item code and an eleventh
 * loot-row field; 10: lag compensation by measured ping, the playback timeline on the server's
 * clock, and hits sent at once in `br-fast` messages, which an older client would not read; 11:
 * the Hunting Rifle, a new weapon and item code; 12: the fixes-v1 world: helidecks with collision
 * of their own, every hospital window a breakable pane (the pane ids move), lifts called from
 * the landing; 13: the 16-perk tablet without Tactical Data, its state on the tablet item, and
 * footprints; 14: the SPAS-12 with its pellets, its shells loaded one at a time, and two new
 * item codes; 15: audio-only occluded player rows, also used by canaries. Older renderers
 * cannot safely consume canary-enabled snapshots and must reload; 16: the faster canopy glide,
 * plates fitted without a vest, and supply crates that hold their loot (the drop rows carry
 * the ids inside); 17: player rows carry the guns worn on the back (index 12), the rope fields
 * after them); 18: the ground on the asphalt as drawn (the runways and roadside lots now in the
 * world, the roads over the drawn ground) and vehicles resting on their tyres, both predicted
 * by the client; 19: the Southern Military Base's wall, new buildings and levelled flight line
 * (world garrison-v2, height.v6), predicted by the client.
 */
export const BR_RULESET_VERSION = 19;
