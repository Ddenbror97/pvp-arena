import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Fairness invariant (docs/battle-royale/PLAN.md §10): adaptive resolution and cosmetic scaling
 * must never affect gameplay, hit detection, visibility or simulation determinism. The
 * structural guarantee: nothing the simulation or the servers run can reach the renderer, the
 * render budget, settings or any three.js code.
 */
const ROOT = path.resolve(__dirname, "..");
const GAMEPLAY_ROOTS = [
  "src/lib/fps/simulation.ts",
  "src/lib/fps/combat.ts",
  "src/lib/fps/collision.ts",
  "src/lib/fps/visibility.ts",
  "src/lib/fps/practice-bot.ts",
  "src/lib/fps/bomb/match.ts",
  "src/lib/fps/bomb/bots.ts",
  "src/lib/fps/br/heightfield.ts",
  "src/lib/fps/br/world.ts",
  "src/lib/fps/br/layout.ts",
  "src/lib/fps/br/island.ts",
  "src/lib/fps/br/walls.ts",
  "src/lib/fps/br/drop.ts",
  "src/lib/fps/br/movement.ts",
  "src/lib/fps/br/static-world.ts",
  "src/lib/fps/br/vegetation.ts",
  "src/lib/fps/br/landcover.ts",
  "workers/fps/index.ts",
  "workers/fps/bomb.ts",
];
const FORBIDDEN = [
  /src\/lib\/fps\/presentation\.ts$/,
  /src\/lib\/fps\/renderer[^/]*\.ts$/,
  /src\/lib\/fps\/settings\.ts$/,
  /src\/lib\/fps\/br\/(terrain|water|vegetation-renderer|props-renderer|structures-renderer|dev-overlay|context-loss)\.ts$/,
  /\.tsx$/,
  /^three(\/|$)/,
];

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return spec; // package
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")])
    if (existsSync(candidate) && candidate.match(/\.tsx?$/)) return candidate;
  return null;
}

function reachable(roots: string[]) {
  const seen = new Map<string, string>(); // module → importer
  const stack = roots.map((r) => path.join(ROOT, r));
  for (const r of stack) seen.set(r, "(root)");
  while (stack.length) {
    const file = stack.pop()!;
    const source = readFileSync(file, "utf8");
    // Static imports and re-exports; type-only imports cannot run code, so skip them.
    for (const m of source.matchAll(
      /^\s*(?:import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm,
    )) {
      if (m[1]) continue;
      const target = resolve(file, m[2]!);
      if (!target || seen.has(target)) continue;
      seen.set(target, file);
      if (path.isAbsolute(target)) stack.push(target);
    }
    for (const m of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
      const target = resolve(file, m[1]!);
      if (!target || seen.has(target)) continue;
      seen.set(target, file);
      if (path.isAbsolute(target)) stack.push(target);
    }
  }
  return seen;
}

describe("fairness boundary: gameplay never depends on rendering", () => {
  it("simulation, hit, visibility, bot and server code cannot reach the renderer or budget", () => {
    const seen = reachable(GAMEPLAY_ROOTS);
    const violations = [...seen.entries()]
      .map(([mod, by]) => [
        path.relative(ROOT, mod).split(path.sep).join("/"),
        path.relative(ROOT, by),
      ])
      .filter(([mod]) => FORBIDDEN.some((re) => re.test(mod!)))
      .map(([mod, by]) => `${mod} (imported by ${by})`);
    expect(violations).toEqual([]);
    // Sanity: the walk really followed the graph.
    expect(seen.size).toBeGreaterThan(20);
  });
});
