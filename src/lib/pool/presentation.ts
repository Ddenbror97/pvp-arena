import { PHYSICS_V5, cushionLimit, type Ball } from "./physics";

export type RackBall = { id: number; down: boolean; stripe: boolean };

export function ballRack(
  balls: readonly { id: number; pocketed: boolean }[],
  group: "solids" | "stripes" | null,
): RackBall[] {
  if (!group) return [];
  const ids = group === "solids" ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
  return ids.map((id) => ({
    id,
    down: balls.some((ball) => ball.id === id && ball.pocketed),
    stripe: id > 8,
  }));
}

export function ballsAhead(
  balls: readonly { id: number; pocketed: boolean }[],
  group: "solids" | "stripes" | null,
  other: "solids" | "stripes" | null,
): boolean {
  if (!group || !other) return false;
  const down = (side: "solids" | "stripes") =>
    ballRack(balls, side).filter((ball) => ball.down).length;
  return down(group) > down(other);
}

export function impactOf(prev: readonly Ball[], next: readonly Ball[], physics: string | null) {
  let pocket = false;
  let ball = 0;
  let rail = 0;
  for (const nb of next) {
    const ob = prev.find((item) => item.id === nb.id);
    if (!ob) continue;
    if (!ob.pocketed && nb.pocketed) pocket = true;
    const before = Math.hypot(ob.vx, ob.vy);
    const after = Math.hypot(nb.vx, nb.vy);
    const drop = before - after;
    if (drop < 700 || before < 1200) continue;
    const wall = cushionLimit(physics ?? PHYSICS_V5);
    const nearRail =
      nb.x < wall.minX + 14_000 ||
      nb.y < wall.minY + 14_000 ||
      nb.x > wall.maxX - 14_000 ||
      nb.y > wall.maxY - 14_000;
    if (nearRail) rail = Math.max(rail, drop);
    else ball = Math.max(ball, drop);
  }
  return { pocket, ball, rail };
}
