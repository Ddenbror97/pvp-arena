import type { MatchState, Seat } from "./protocol";
import { characterSide } from "./sides";

/** The weapons a kill feed shows (WeaponIcon.tsx draws each). */
export type FeedWeapon = "ak" | "m4" | "awp" | "mp5" | "deagle" | "knife" | "he" | "fire" | "bomb";

/**
 * The weapon of a kill, from the killing event (1v1 hits and 5v5 kills carry the same fields):
 * a grenade's type, the Karambit, the Desert Eagle (the sidearm), the bought AWP or MP5, or the
 * side's rifle, the Police M4A1-S or the Terrorist AK-47, by the killer's side when it fired.
 * Nothing that names a weapon: the bomb.
 */
export function feedWeapon(
  ev: { nade?: string | undefined; weapon?: string | undefined; primary?: string | undefined },
  policeRifle: boolean,
): FeedWeapon {
  if (ev.nade === "fire") return "fire";
  if (ev.nade === "he") return "he";
  if (ev.weapon === "knife") return "knife";
  if (ev.weapon === "sidearm") return "deagle";
  if (ev.primary === "awp") return "awp";
  if (ev.primary === "mp5") return "mp5";
  if (ev.weapon === "rifle") return policeRifle ? "m4" : "ak";
  return "bomb";
}

/** The weapon a player holds, for the HUD's equipped-weapon glyph (none while a grenade is out). */
export function heldWeapon(
  p: { weapon?: string | undefined; primary?: string | undefined },
  policeRifle: boolean,
): FeedWeapon | null {
  if (p.weapon === "grenade") return null;
  if (p.weapon === "knife") return "knife";
  if (p.weapon === "sidearm") return "deagle";
  return feedWeapon({ weapon: "rifle", primary: p.primary }, policeRifle);
}

/** One kill in the 1v1's feed (seats; the HUD names them). */
export type DuelKill = { killer: Seat; victim: Seat; weapon: FeedWeapon; headshot: boolean };

/**
 * The 1v1's kills between two snapshots: a player whose health fell to 0, killed by the hit that
 * did it (this snapshot's hit on them: the gun, Karambit or grenade it names, and whether it was
 * a headshot). The 1v1's rifle is the M4A1-S on the Police side (A) and the AK-47 on the
 * Terrorist side (B), and the sides swap at halftime. Without the hit (a snapshot missed), the
 * killer's weapon in hand.
 */
export function duelKills(previous: MatchState | undefined, next: MatchState): DuelKill[] {
  if (!previous) return [];
  const out: DuelKill[] = [];
  for (const victim of ["A", "B"] as const) {
    if (!(previous.players[victim].hp > 0 && next.players[victim].hp <= 0)) continue;
    // (A player's snapshot leaves out the hit's details when the victim is out of their sight:
    // then the hit on nobody named, in a 1v1 the one on them.)
    const hits = next.events.filter((e) => e.type === "hit" || e.type === "headshot");
    const hit =
      hits.filter((e) => e.hit?.victim === victim).at(-1) ?? hits.filter((e) => !e.hit).at(-1);
    const killer: Seat = hit?.seat ?? (victim === "A" ? "B" : "A");
    const police = characterSide(next, killer) === "A";
    const held = next.players[killer];
    out.push({
      killer,
      victim,
      weapon: hit
        ? feedWeapon(hit, police)
        : (heldWeapon({ weapon: held.weapon, primary: held.primary }, police) ?? "he"),
      headshot: hit?.type === "headshot",
    });
  }
  return out;
}
