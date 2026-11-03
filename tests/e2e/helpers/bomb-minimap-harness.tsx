import { createRoot } from "react-dom/client";
import { BombMinimap } from "../../../src/components/fps/BombMinimap";
import { createBombMatch } from "../../../src/lib/fps/bomb/match";
import { bombViewFor, BombReveal } from "../../../src/lib/fps/bomb/snapshot";
export function mountMinimap(host: HTMLElement) {
  const s = createBombMatch(
    Array.from({ length: 10 }, (_, i) => ({ id: "p" + i, name: "P" + i, bot: true })),
    0,
    7,
  );
  const view = bombViewFor(s, 0, null, new BombReveal(), 0);
  createRoot(host).render(
    <div className="duel-game bomb-game">
      <BombMinimap view={view} />
      <aside className="bomb-equipment">
        <strong>Police equipment</strong>
        <p>Defuse kit · Free</p>
        <button>Equip defuse kit · B</button>
        <small>5-second defuse · This round only</small>
      </aside>
    </div>,
  );
}
