import { ZONE_PHASES } from "@/lib/fps/br/zone";
import { WORLD_SIZE } from "@/lib/fps/br/world";
import { TABLE_W, TABLE_H, BALL_R } from "@/lib/pool/physics";

// Deliberate intent allowlists: our rules are not evidence about another publisher's game.
export const BR_RULE_GUIDES = new Set(["browser-battle-royale", "battle-royale-games"]);
export const POOL_RULE_GUIDES = new Set([
  "8-ball-pool-hub",
  "8-ball-pool-rules",
  "8-ball-pool-break",
  "8-ball-pool-aim",
  "how-to-win-8-ball-pool",
]);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Build-derived first-party facts, not invented match history or player benchmarks. */
export function PracticeRuleData({ slug }: { slug: string }) {
  if (BR_RULE_GUIDES.has(slug)) {
    let elapsed = 0;
    return (
      <section id="practice-rules" className="my-8 rounded-2xl border border-border p-5">
        <h2 className="font-display text-2xl">Project Island's current safe-zone schedule</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          These values come from the same zone configuration used by our match server. The map spans{" "}
          {WORLD_SIZE / 1000} km on each side. Times below start at take-off, excluding warm-up.
          Matches can end before the full schedule when one survivor remains. This is free-mode
          configuration, not observed completion times or cash results.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">Project Island full-lobby zone phases</caption>
            <thead>
              <tr>
                {["Phase", "Wait", "Shrink", "Cumulative time"].map((label) => (
                  <th key={label} className="p-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZONE_PHASES.map((phase, index) => {
                elapsed += phase.wait + phase.shrink;
                return (
                  <tr key={index} className="border-t border-border">
                    <th scope="row" className="p-2">
                      {index + 1}
                    </th>
                    <td className="p-2">{clock(phase.wait)}</td>
                    <td className="p-2">{clock(phase.shrink)}</td>
                    <td className="p-2">{clock(elapsed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  if (!POOL_RULE_GUIDES.has(slug)) return null;
  return (
    <section id="practice-rules" className="my-8 rounded-2xl border border-border p-5">
      <h2 className="font-display text-2xl">The table used in our 8-ball Practice</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Our shared pool physics uses a {TABLE_W / 1_000_000} m × {TABLE_H / 1_000_000} m table and a{" "}
        {(BALL_R * 2) / 1000} mm ball diameter. That is a {TABLE_W / TABLE_H}:1 table ratio.
        Practice uses this geometry too, so aiming and break drills use the same dimensions. These
        are our simulator's dimensions, not specifications for every physical pool table.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Practice is local to your browser and has no cash entry or prize. We do not have a centrally
        recorded practice history, so no match total, bot win rate or average score is claimed here.
      </p>
    </section>
  );
}
