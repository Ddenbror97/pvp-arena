import { BALL_R, POCKETS, cushionLimit, simulate, type Ball, type ShotInput } from "./physics";
import {
  applyPlayedShot,
  defaultCueSpot,
  groupClear,
  groupOf,
  legalPlacement,
  placeCue,
  seatGroup,
  type TableState,
} from "./rules";

const angle = (x: number, y: number) =>
  ((Math.round((Math.atan2(y, x) * 180000) / Math.PI) % 360000) + 360000) % 360000;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
function blocked(
  balls: readonly Ball[],
  a: { x: number; y: number },
  b: { x: number; y: number },
  ignore: number,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = dx * dx + dy * dy;
  return balls.some((ball) => {
    if (ball.pocketed || ball.id === 0 || ball.id === ignore) return false;
    const t = Math.max(0, Math.min(1, ((ball.x - a.x) * dx + (ball.y - a.y) * dy) / (len || 1)));
    return Math.hypot(ball.x - a.x - t * dx, ball.y - a.y - t * dy) < BALL_R * 2 + 700;
  });
}
function input(
  aim: number,
  power: number,
  place: { x: number; y: number } | null,
  pocket: number | null,
): ShotInput {
  return {
    angleMilli: ((Math.round(aim) % 360000) + 360000) % 360000,
    power,
    spinX: 0,
    spinY: 0,
    placeX: place?.x ?? null,
    placeY: place?.y ?? null,
    calledPocket: pocket,
  };
}

/** Dedicated Practice opponent. Bounded search runs only in a background worker.
 * It sees the same stationary table and uses the same physics/rules as a player.
 * It never moves balls directly, changes outcomes or calls a cash-game endpoint.
 */
export function choosePracticeShot(
  state: TableState,
  random: () => number = Math.random,
): ShotInput {
  if (state.winner) throw Error("PRACTICE_FINISHED");
  const cue = state.balls.find((b) => b.id === 0)!;
  const group = seatGroup(state, state.turn);
  const eight = group !== null && groupClear(state.balls, group);
  const targets = state.balls.filter(
    (b) =>
      !b.pocketed &&
      b.id !== 0 &&
      (eight ? b.id === 8 : b.id !== 8 && (!group || groupOf(b.id) === group)),
  );
  const defaultPlace = state.ballInHand ? defaultCueSpot(state) : null;
  if (state.ballInHand && !defaultPlace) throw Error("PRACTICE_NO_PLACEMENT");
  if (state.breakShot) {
    const place = defaultPlace ?? cue;
    return input(
      angle(1905000 - place.x, 635000 - place.y) + (random() - 0.5) * 350,
      9600,
      defaultPlace,
      null,
    );
  }
  type Line = {
    aim: number;
    place: { x: number; y: number } | null;
    pocket: number | null;
    rank: number;
    ball: Ball;
  };
  const lines: Line[] = [];
  const wall = cushionLimit(state.physics);
  for (const ball of targets)
    for (const pocket of POCKETS) {
      const d = distance(ball, pocket),
        ux = (pocket.x - ball.x) / d,
        uy = (pocket.y - ball.y) / d;
      const ghost = { x: ball.x - ux * BALL_R * 2, y: ball.y - uy * BALL_R * 2 };
      if (
        ghost.x < wall.minX ||
        ghost.x > wall.maxX ||
        ghost.y < wall.minY ||
        ghost.y > wall.maxY ||
        blocked(state.balls, ball, pocket, ball.id)
      )
        continue;
      const places: ({ x: number; y: number } | null)[] = state.ballInHand
        ? [4, 8, 13]
            .map((n) => ({
              x: Math.round(ghost.x - ux * BALL_R * n),
              y: Math.round(ghost.y - uy * BALL_R * n),
            }))
            .filter((p) => legalPlacement(state, p.x, p.y))
        : [null];
      if (state.ballInHand && defaultPlace) places.push(defaultPlace);
      for (const place of places) {
        const from = place ?? cue,
          travel = distance(from, ghost);
        if (travel < BALL_R || blocked(state.balls, from, ghost, ball.id)) continue;
        const dot = ((ghost.x - from.x) * ux + (ghost.y - from.y) * uy) / travel;
        if (dot < 0.22) continue;
        lines.push({
          aim: angle(ghost.x - from.x, ghost.y - from.y),
          place,
          pocket: eight ? pocket.id : null,
          rank: dot * 3 - (travel + d) / 3500000,
          ball,
        });
      }
    }
  lines.sort((a, b) => b.rank - a.rank);
  // Keep several routes and powers, but cap physics evaluations independently of rack density.
  let best: ShotInput | null = null,
    bestScore = -Infinity;
  const evaluate = (shot: ShotInput, quality: number) => {
    const working = structuredClone(state);
    if (placeCue(working, shot)) return;
    const sim = simulate(working.balls, shot, false, state.physics);
    const played = applyPlayedShot(working, sim, shot.calledPocket);
    const own = sim.pocketed.filter(
      (id) => id !== 0 && id !== 8 && (!group || groupOf(id) === group),
    ).length;
    const opponent = sim.pocketed.filter(
      (id) => id !== 0 && id !== 8 && group && groupOf(id) !== group,
    ).length;
    const score =
      played.state.winner === state.turn
        ? 10000
        : played.state.winner
          ? -10000
          : own * 180 -
            opponent * 35 -
            (played.event.foul ? 500 : 0) +
            (sim.firstContact !== null ? 8 : 0) +
            quality;
    if (score > bestScore) {
      bestScore = score;
      best = shot;
    }
  };
  for (const line of lines.slice(0, 8)) {
    for (const power of [2600, 3900, 5400, 7100])
      evaluate(input(line.aim, power, line.place, line.pocket), line.rank);
  }
  // When snookered, test legal contact and one-cushion escapes instead of firing blindly.
  const from = defaultPlace ?? cue;
  for (const target of targets.slice(0, 7)) {
    const called = eight
      ? POCKETS.reduce((a, b) => (distance(target, a) < distance(target, b) ? a : b)).id
      : null;
    const points = [
      target,
      { x: 2 * wall.minX - target.x, y: target.y },
      { x: 2 * wall.maxX - target.x, y: target.y },
      { x: target.x, y: 2 * wall.minY - target.y },
      { x: target.x, y: 2 * wall.maxY - target.y },
    ];
    for (const point of points)
      evaluate(input(angle(point.x - from.x, point.y - from.y), 5200, defaultPlace, called), -5);
  }
  if (!best) throw Error("PRACTICE_NO_SHOT");
  // Small execution error: competent, but long/thin cuts can still miss. Physics stays exact.
  const chosen = best as ShotInput;
  return {
    ...chosen,
    angleMilli:
      (((chosen.angleMilli + Math.round((random() + random() - 1) * 180)) % 360000) + 360000) %
      360000,
  };
}
