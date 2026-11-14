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
      <footer className="duel-hud-bottom">
        <div className="duel-health">
          <small>HEALTH</small>
          <strong>100</strong>
        </div>
        <div className="duel-ammo">
          <small>M4A1-S · ANTI-TERRORIST</small>
          <div className="bomb-ammo-row">
            <span
              className="bomb-kit-icon"
              role="img"
              aria-label="Defuse kit equipped: five-second defuse"
            >
              ⚒
            </span>
            <strong>
              30<span>/ 90</span>
            </strong>
          </div>
        </div>
      </footer>
    </div>,
  );
}
