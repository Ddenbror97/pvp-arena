import { BALL_R, cosMicro, cushionLimit, sinMicro, type Ball } from "@/lib/pool/physics";

/**
 * Nine ball diameters from the cue center. Long enough to see the shot
 * direction, short of a length of the table.
 */
export const AIM_LINE_REACH = BALL_R * 18;

/** The stroke starts just clear of the cue ball. */
export const AIM_LINE_GAP = Math.round(BALL_R * 1.28);

/**
 * Daylight left before an object ball. The line points at the ball and
 * stops before the contact point.
 */
export const AIM_LINE_CLEAR = Math.round(BALL_R * 0.85);

export type AimLine = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};

/**
 * A short cue-direction stroke. It uses the same angle the stick will send
 * and stops at the first cushion. It does not follow the object ball.
 */
export function shortAimLine(
  balls: readonly Pick<Ball, "id" | "x" | "y" | "pocketed">[],
  origin: { x: number; y: number },
  angleMilli: number,
): AimLine | null {
  const rawX = cosMicro(angleMilli | 0);
  const rawY = sinMicro(angleMilli | 0);
  const mag = Math.hypot(rawX, rawY);
  if (mag < 1) return null;
  const dirX = rawX / mag;
  const dirY = rawY / mag;
  const start = AIM_LINE_GAP;
  let reach = Math.min(AIM_LINE_REACH, cushionReach(origin, dirX, dirY));
  const hitRadius = BALL_R * 2;
  for (const ball of balls) {
    if (ball.id === 0 || ball.pocketed) continue;
    const dx = ball.x - origin.x;
    const dy = ball.y - origin.y;
    const along = dx * dirX + dy * dirY;
    if (along <= start) continue;
    const lateralX = dx - along * dirX;
    const lateralY = dy - along * dirY;
    const lateral = Math.hypot(lateralX, lateralY);
    if (lateral >= hitRadius) continue;
    const into = Math.sqrt(hitRadius * hitRadius - lateral * lateral);
    const before = along - into - AIM_LINE_CLEAR;
    if (before < reach) reach = before;
  }
  if (reach <= start + BALL_R * 0.15) return null;
  return {
    from: { x: origin.x + dirX * start, y: origin.y + dirY * start },
    to: { x: origin.x + dirX * reach, y: origin.y + dirY * reach },
  };
}

function cushionReach(origin: { x: number; y: number }, dirX: number, dirY: number): number {
  const wall = cushionLimit();
  let t = Number.POSITIVE_INFINITY;
  if (dirX > 1e-8) t = Math.min(t, (wall.maxX - origin.x) / dirX);
  else if (dirX < -1e-8) t = Math.min(t, (wall.minX - origin.x) / dirX);
  if (dirY > 1e-8) t = Math.min(t, (wall.maxY - origin.y) / dirY);
  else if (dirY < -1e-8) t = Math.min(t, (wall.minY - origin.y) / dirY);
  return t;
}
