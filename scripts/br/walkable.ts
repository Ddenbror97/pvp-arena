/**
 * Ground a player can walk to from the lowlands round a summit, by movement.ts's rule: a move
 * along x or z is refused where the terrain rises faster than `limit` (rise over run) along it.
 * A flood over a grid (`cell` m) of the box `radius` m round `centre`, from the box's edge
 * below `lowland` m. Returns the test for a point in the box.
 */
export function walkable(
  ground: { heightAt(x: number, z: number): number },
  centre: { x: number; z: number },
  limit: number,
  { radius = 600, cell = 0.5, lowland = 300 } = {},
) {
  const T = centre,
    R = radius,
    G = cell,
    N = Math.round((2 * R) / G) + 1;
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) H[j * N + i] = ground.heightAt(T.x - R + i * G, T.z - R + j * G);
  const reach = new Uint8Array(N * N);
  const q: number[] = [];
  // From the box's edge in the lowlands (the valleys and the lower slopes round the massif).
  for (let i = 0; i < N; i++)
    for (const k of [i, (N - 1) * N + i, i * N, i * N + N - 1])
      if (!reach[k] && H[k]! < lowland) {
        reach[k] = 1;
        q.push(k);
      }
  while (q.length) {
    const k = q.pop()!;
    const i = k % N,
      j = (k - i) / N;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const a = i + di,
        c = j + dj;
      if (a < 0 || c < 0 || a >= N || c >= N) continue;
      const m = c * N + a;
      if (reach[m] || H[m]! - H[k]! > G * limit) continue;
      reach[m] = 1;
      q.push(m);
    }
  }
  return (x: number, z: number) =>
    reach[Math.round((z - T.z + R) / G) * N + Math.round((x - T.x + R) / G)] === 1;
}
