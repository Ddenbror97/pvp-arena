import { BOMB_RULES, type Group, type Team } from "./rules";
import { bombsiteAt } from "./sandgate";
import type { BombView, PublicPlayer } from "./snapshot";

/** Pure HUD derivations from one per-recipient snapshot (unit-tested; no DOM, no clock reads). */

export const teamLabel = (team: Team) => (team === "police" ? "Police" : "Terrorists");
export const myPlayer = (view: BombView) => view.players[view.you]!;
export const myTeam = (view: BombView) => myPlayer(view).team;
export const myGroup = (view: BombView) => myPlayer(view).group;
export const otherGroup = (group: Group): Group => (group === "alpha" ? "bravo" : "alpha");

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The top clock: freeze countdown, round clock, or a status word. A planted bomb hides the clock
 * (the bomb timer is never shown, as in the reference games: listen to the beeps).
 */
export function clockText(view: BombView, serverNow: number) {
  switch (view.phase) {
    case "warmup":
      return "WARMUP";
    case "freeze":
      return mmss(view.phaseEndsAt - serverNow);
    case "live":
      return view.bomb.state === "planted" ? "BOMB" : mmss(view.roundEndsAt - serverNow);
    case "round-end":
      return "ROUND OVER";
    case "halftime":
      return "HALFTIME";
    case "completed":
      return "MATCH OVER";
  }
}

/** Living players per team (for the team bar). */
export function aliveByTeam(view: BombView) {
  const out: Record<Team, PublicPlayer[]> = { police: [], terrorist: [] };
  for (const p of view.players) out[p.team].push(p);
  for (const list of Object.values(out)) list.sort((a, b) => a.slot - b.slot);
  return out;
}

/** Objective prompt and progress for the recipient (null: nothing to show). */
export function objective(
  view: BombView,
  serverNow: number,
): { text: string; progress?: number; tone: "info" | "action" | "alert" } | null {
  const me = myPlayer(view),
    self = view.self,
    b = view.bomb,
    team = me.team;
  if (view.phase !== "live" && view.phase !== "freeze") return null;
  if (self.hp <= 0) return null;
  if (team === "terrorist") {
    if (b.state === "planting" && b.carrier === view.you)
      return {
        text: "Planting…",
        progress: Math.min(1, (serverNow - (b.plantStartedAt ?? serverNow)) / BOMB_RULES.plantMs),
        tone: "action",
      };
    if (b.state === "planting" && b.carrier !== undefined)
      return {
        text: `${view.players[b.carrier]?.name ?? "A teammate"} is planting`,
        progress: Math.min(1, (serverNow - (b.plantStartedAt ?? serverNow)) / BOMB_RULES.plantMs),
        tone: "info",
      };
    if (b.state === "carried" && b.carrier === view.you) {
      const site = bombsiteAt(self.x, self.z);
      return site && view.phase === "live"
        ? { text: `Hold E to plant at ${site}`, tone: "action" }
        : { text: "You have the bomb · plant it at A or B", tone: "info" };
    }
    if (b.state === "dropped") return { text: "The bomb was dropped · pick it up", tone: "alert" };
    if (b.state === "planted")
      return { text: `Bomb planted at ${b.site} · defend it`, tone: "info" };
    return null;
  }
  if (b.state === "planted") {
    if (b.defuser === view.you)
      return {
        text: "Defusing…",
        progress: Math.min(
          1,
          (serverNow - (b.defuseStartedAt ?? serverNow)) / (b.defuseMs ?? BOMB_RULES.defuseMs),
        ),
        tone: "action",
      };
    if (b.defuser !== undefined)
      return {
        text: `${view.players[b.defuser]?.name ?? "A teammate"} is defusing`,
        progress: Math.min(
          1,
          (serverNow - (b.defuseStartedAt ?? serverNow)) / (b.defuseMs ?? BOMB_RULES.defuseMs),
        ),
        tone: "info",
      };
    if (
      b.x !== undefined &&
      Math.hypot(self.x - b.x, self.z - (b.z ?? 0)) <= BOMB_RULES.defuseRadius &&
      Math.abs(self.y - (b.y ?? 0)) < 1.5
    )
      return { text: "Hold E to defuse", tone: "action" };
    return { text: `Bomb planted at ${b.site} · retake and defuse`, tone: "alert" };
  }
  return null;
}

/** Banner text after a round. */
export function roundBanner(view: BombView) {
  const last = view.lastRound;
  if (!last || view.phase !== "round-end") return null;
  const reason = {
    elimination: "Enemy eliminated",
    bomb: "The bomb exploded",
    defuse: "The bomb was defused",
    time: "Time ran out",
  }[last.reason];
  return {
    title: `${teamLabel(last.winner)} win`,
    detail: reason,
    mine: last.group === myGroup(view),
  };
}

export type ScoreRow = PublicPlayer & { you: boolean; hsPercent: number };

/** Scoreboard rows: recipient's team first, each sorted by kills then fewest deaths. */
export function scoreboard(view: BombView) {
  const mine = myTeam(view);
  const rows = (team: Team): ScoreRow[] =>
    view.players
      .filter((p) => p.team === team)
      .map((p) => ({
        ...p,
        you: p.slot === view.you,
        hsPercent: p.kills ? Math.round((p.headshots / p.kills) * 100) : 0,
      }))
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.slot - b.slot);
  const other: Team = mine === "police" ? "terrorist" : "police";
  const groupOf = (team: Team) => view.players.find((p) => p.team === team)!.group;
  return [
    { team: mine, group: groupOf(mine), score: view.score[groupOf(mine)], rows: rows(mine) },
    { team: other, group: groupOf(other), score: view.score[groupOf(other)], rows: rows(other) },
  ];
}

/** Final result from the recipient's side. */
export function matchResult(view: BombView): "victory" | "defeat" | "draw" | null {
  if (view.phase !== "completed" || !view.winner) return null;
  if (view.winner === "draw") return "draw";
  return view.winner === myGroup(view) ? "victory" : "defeat";
}

/** The beep interval of a planted bomb (ms): slow at plant, fast near the end. */
export function beepInterval(msLeft: number) {
  const f = Math.max(0, Math.min(1, msLeft / BOMB_RULES.bombMs));
  return 150 + f * 850;
}
